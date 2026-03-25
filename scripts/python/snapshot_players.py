"""
snapshot_players.py — Take a daily snapshot of all player scores.

Reads every player from Supabase, writes one row per player into player_history
with today's date.  Re-running on the same day is safe: the upsert on the unique
index (player_id, snapshot_date) simply updates the existing row.

Usage:
    cd scripts/python
    venv/Scripts/python snapshot_players.py      # Windows
    venv/bin/python snapshot_players.py          # macOS/Linux
"""

import json
import logging
import os
import sys
from datetime import date

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

# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_players() -> list[dict]:
    """Return all players: (id, scout_score, individual_stats)."""
    url = f"{SUPABASE_URL}/rest/v1/players"
    params = {"select": "id,scout_score,individual_stats"}
    r = requests.get(url, headers=_BASE_HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def upsert_snapshots(snapshots: list[dict]) -> None:
    """Upsert a batch of snapshots.

    Uses resolution=merge-duplicates so re-running on the same day is idempotent.
    """
    # on_conflict tells PostgREST which columns define the upsert key
    url = f"{SUPABASE_URL}/rest/v1/player_history?on_conflict=player_id,snapshot_date"
    headers = {
        **_BASE_HEADERS,
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    r = requests.post(url, headers=headers, json=snapshots, timeout=30)
    r.raise_for_status()


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    today = date.today().isoformat()
    log.info("Starting snapshot for %s", today)

    players = fetch_players()
    log.info("  %d players fetched", len(players))

    snapshots = [
        {
            "player_id":       p["id"],
            "overall_score":   int(p["scout_score"]),
            "individual_stats": p.get("individual_stats"),
            "snapshot_date":   today,
        }
        for p in players
        if p.get("id") and p.get("scout_score") is not None
    ]

    if not snapshots:
        log.warning("No valid players found — nothing to snapshot.")
        return

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

    log.info("Done — %d snapshots saved for %s", len(snapshots), today)


if __name__ == "__main__":
    main()
