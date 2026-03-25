"""
snapshot_players.py — Take a daily snapshot of all player scores.

Reads every player from Supabase, writes one row per player into player_history
with today's date.  Re-running on the same day is safe: the upsert on the unique
index (player_id, snapshot_date) simply updates the existing row.

After snapshotting, compares new scores with the previous snapshot. If a player's
score changed by more than 5 points, inserts a notification for every user who has
that player in their shortlist.

Usage:
    cd scripts/python
    venv/Scripts/python snapshot_players.py      # Windows
    venv/bin/python snapshot_players.py          # macOS/Linux
"""

import logging
import os
import sys
from datetime import date, timedelta

import requests
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────

_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(_env_path)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SERVICE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
)

if not SUPABASE_URL or not SERVICE_KEY:
    log.error(
        "Missing environment variables. Expected in .env:\n"
        "  VITE_SUPABASE_URL=...\n"
        "  SUPABASE_SERVICE_ROLE_KEY=..."
    )
    sys.exit(1)

_BASE_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

BATCH_SIZE = 50
SCORE_DELTA_THRESHOLD = 5  # notify only when delta > this

# ── API helpers ───────────────────────────────────────────────────────────────

def _get(path: str, params: dict) -> list[dict]:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=_BASE_HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def _post(path: str, payload: list[dict], prefer: str = "return=minimal") -> None:
    headers = {**_BASE_HEADERS, "Prefer": prefer}
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=headers, json=payload, timeout=30)
    r.raise_for_status()


# ── Fetch functions ───────────────────────────────────────────────────────────

def fetch_players() -> list[dict]:
    """Return all players: id, name, scout_score, individual_stats."""
    return _get("players", {"select": "id,name,scout_score,individual_stats"})


def fetch_previous_snapshots() -> dict[str, int]:
    """Return {player_id: overall_score} for the most recent snapshot before today.

    Fetches all rows before today ordered by date DESC; keeps the first
    (most recent) score seen per player.
    """
    today = date.today().isoformat()
    rows = _get("player_history", {
        "select": "player_id,overall_score,snapshot_date",
        "snapshot_date": f"lt.{today}",
        "order": "snapshot_date.desc",
    })
    prev: dict[str, int] = {}
    for row in rows:
        pid = row["player_id"]
        if pid not in prev:
            prev[pid] = row["overall_score"]
    return prev


def fetch_shortlist_users(player_ids: list[str]) -> list[dict]:
    """Return [{user_id, player_id}] for all shortlist entries matching the given players."""
    if not player_ids:
        return []
    ids_csv = ",".join(player_ids)
    return _get("shortlists", {
        "select": "user_id,player_id",
        "player_id": f"in.({ids_csv})",
    })


# ── Upsert / insert ───────────────────────────────────────────────────────────

def upsert_snapshots(snapshots: list[dict]) -> None:
    """Upsert a batch of snapshots — idempotent on (player_id, snapshot_date)."""
    _post(
        "player_history?on_conflict=player_id,snapshot_date",
        snapshots,
        prefer="resolution=merge-duplicates,return=minimal",
    )


def insert_notifications(notifications: list[dict]) -> None:
    """Bulk-insert score-change notifications."""
    if not notifications:
        return
    _post("notifications", notifications)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    today = date.today().isoformat()
    log.info("Starting snapshot for %s", today)

    # ── 1. Fetch players ──────────────────────────────────────────────────────
    players = fetch_players()
    log.info("  %d players fetched", len(players))

    # ── 2. Build today's snapshots ────────────────────────────────────────────
    snapshots = [
        {
            "player_id":        p["id"],
            "overall_score":    int(p["scout_score"]),
            "individual_stats": p.get("individual_stats"),
            "snapshot_date":    today,
        }
        for p in players
        if p.get("id") and p.get("scout_score") is not None
    ]

    if not snapshots:
        log.warning("No valid players found — nothing to snapshot.")
        return

    # ── 3. Upsert snapshots ───────────────────────────────────────────────────
    log.info("  %d snapshots to upsert", len(snapshots))
    for i in range(0, len(snapshots), BATCH_SIZE):
        batch = snapshots[i : i + BATCH_SIZE]
        upsert_snapshots(batch)
        log.info(
            "  batch %d/%d done (%d rows)",
            i // BATCH_SIZE + 1,
            -(-len(snapshots) // BATCH_SIZE),
            len(batch),
        )
    log.info("Done -- %d snapshots saved for %s", len(snapshots), today)

    # ── 4. Detect score changes vs previous snapshot ──────────────────────────
    log.info("Checking for score changes...")
    prev_scores = fetch_previous_snapshots()

    if not prev_scores:
        log.info("  No previous snapshots found -- skipping notifications.")
        return

    player_name_map = {p["id"]: p["name"] for p in players}
    current_scores  = {p["id"]: int(p["scout_score"]) for p in players if p.get("id") and p.get("scout_score") is not None}

    # Players whose score changed by more than threshold
    changed: dict[str, int] = {}  # player_id -> delta
    for pid, new_score in current_scores.items():
        old_score = prev_scores.get(pid)
        if old_score is None:
            continue
        delta = new_score - old_score
        if abs(delta) > SCORE_DELTA_THRESHOLD:
            changed[pid] = delta

    if not changed:
        log.info("  No significant score changes (threshold: >%d pts).", SCORE_DELTA_THRESHOLD)
        return

    log.info(
        "  %d player(s) with score change > %d pts: %s",
        len(changed),
        SCORE_DELTA_THRESHOLD,
        ", ".join(
            f"{player_name_map.get(pid, pid)} ({'+' if d > 0 else ''}{d})"
            for pid, d in changed.items()
        ),
    )

    # ── 5. Find users who shortlisted those players ───────────────────────────
    shortlist_entries = fetch_shortlist_users(list(changed.keys()))
    if not shortlist_entries:
        log.info("  No shortlist matches -- no notifications to send.")
        return

    # ── 6. Build and insert notifications ─────────────────────────────────────
    notifications = []
    for entry in shortlist_entries:
        pid  = entry["player_id"]
        uid  = entry["user_id"]
        delta = changed[pid]
        name  = player_name_map.get(pid, "Joueur")
        sign  = "+" if delta > 0 else ""
        notifications.append({
            "user_id":   uid,
            "type":      "score_change",
            "title":     f"Score modifie -- {name}",
            "message":   f"Le score de {name} a change de {sign}{delta} pts.",
            "player_id": pid,
        })

    insert_notifications(notifications)
    log.info("  %d notification(s) inserted for %d user(s).", len(notifications), len({n["user_id"] for n in notifications}))


if __name__ == "__main__":
    main()
