"""
scrape_understat.py — Scrape xG / xA / npxG from Understat and upsert to Supabase.

Usage:
    venv/Scripts/python scrape_understat.py [--dry-run]

Leagues scraped (2024-25 season):
    EPL         Premier League (England)
    La_liga     La Liga (Spain)
    Bundesliga  Bundesliga (Germany)
    Serie_A     Serie A (Italy)
    Ligue_1     Ligue 1 (France)

Matching strategy:
    1. Exact match on player name (case-insensitive)
    2. Last-name fallback (last word of Understat name vs last word of DB name)

Columns upserted:
    xg_understat  — season total xG
    xa_understat  — season total xA
    np_xg         — season total non-penalty xG

Output also logs xG_per90 for reference (not stored separately).
"""

import json
import logging
import os
import re
import sys
import time
from typing import Optional
from urllib.parse import unquote

import requests
from dotenv import load_dotenv

# ── UTF-8 on Windows terminals ─────────────────────────────────────────────────

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ── Env ────────────────────────────────────────────────────────────────────────

_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(_env_path)

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    log.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

DRY_RUN = "--dry-run" in sys.argv

# ── Constants ──────────────────────────────────────────────────────────────────

LEAGUES = ["EPL", "La_liga", "Bundesliga", "Serie_A", "Ligue_1"]
UNDERSTAT_BASE  = "https://understat.com/league"
SEASON          = "2024"
RATE_LIMIT_SEC  = 5   # polite delay between league requests

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# ── Understat fetch & parse ─────────────────────────────────────────────────────

def fetch_understat(league: str) -> Optional[list[dict]]:
    """
    Fetch the Understat league page and extract the playersData JSON array.
    Returns a list of player dicts, or None on error.
    """
    url = f"{UNDERSTAT_BASE}/{league}/{SEASON}"
    log.info(f"  GET {url}")
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as e:
        log.warning(f"  Request failed: {e}")
        return None

    html = resp.text

    # Understat embeds data as: var playersData = JSON.parse('URL-encoded-JSON')
    match = re.search(r"var\s+playersData\s*=\s*JSON\.parse\('(.+?)'\)", html)
    if not match:
        log.warning(f"  playersData not found in page for league={league}")
        return None

    try:
        raw_json = unquote(match.group(1))
        players  = json.loads(raw_json)
        log.info(f"  Parsed {len(players)} players from Understat ({league})")
        return players
    except (json.JSONDecodeError, Exception) as e:
        log.warning(f"  JSON parse error: {e}")
        return None


def safe_float(v) -> float:
    try:
        return float(v or 0.0)
    except (ValueError, TypeError):
        return 0.0


def safe_int(v) -> int:
    try:
        return int(v or 0)
    except (ValueError, TypeError):
        return 0


def xg_per90(xg: float, minutes: int) -> str:
    """Return formatted xG/90 string, or '—' if minutes < 1."""
    if minutes < 1:
        return "—"
    return f"{xg / (minutes / 90):.2f}"

# ── Supabase helpers ────────────────────────────────────────────────────────────

def fetch_db_players() -> list[dict]:
    """Load all players from Supabase (id + name only)."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/players",
        params={"select": "id,name"},
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()


def upsert_xg(player_id: str, xg_val: float, xa_val: float, npxg_val: float) -> bool:
    """PATCH xg/xa/npxg columns for a single player by id."""
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/players",
        params={"id": f"eq.{player_id}"},
        json={
            "xg_understat": round(xg_val, 3),
            "xa_understat": round(xa_val, 3),
            "np_xg":        round(npxg_val, 3),
        },
        headers={
            "apikey":         SUPABASE_KEY,
            "Authorization":  f"Bearer {SUPABASE_KEY}",
            "Content-Type":   "application/json",
            "Prefer":         "return=minimal",
        },
        timeout=15,
    )
    return resp.status_code in (200, 204)

# ── Name matching ───────────────────────────────────────────────────────────────

def _normalise(name: str) -> str:
    """Lower-case, strip accents minimally, collapse whitespace."""
    return " ".join(name.strip().lower().split())


def _last_name(name: str) -> str:
    return _normalise(name).split()[-1] if name.strip() else ""


def find_db_player(
    understat_name: str,
    db_index_exact: dict[str, str],
    db_index_last:  dict[str, list[str]],
) -> Optional[str]:
    """
    Return DB player_id matching understat_name.
    1. Exact normalised match
    2. Last-name fallback (unique match only)
    """
    norm = _normalise(understat_name)

    # 1. Exact
    if norm in db_index_exact:
        return db_index_exact[norm]

    # 2. Last name (only if unambiguous)
    last = _last_name(understat_name)
    candidates = db_index_last.get(last, [])
    if len(candidates) == 1:
        return candidates[0]

    return None

# ── Main ────────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("=== Understat xG scraper ===")
    if DRY_RUN:
        log.info("DRY-RUN mode — no writes to Supabase")

    # Build lookup tables from DB
    log.info("Loading players from Supabase…")
    try:
        db_players = fetch_db_players()
    except Exception as e:
        log.error(f"Could not load DB players: {e}")
        sys.exit(1)

    log.info(f"  {len(db_players)} players loaded")

    db_index_exact: dict[str, str]       = {}   # normalised_name → id
    db_index_last:  dict[str, list[str]] = {}   # last_word       → [ids]

    for p in db_players:
        pid  = p["id"]
        norm = _normalise(p["name"])
        last = _last_name(p["name"])

        db_index_exact[norm] = pid
        db_index_last.setdefault(last, []).append(pid)

    # Per-league scrape
    total_updated  = 0
    total_skipped  = 0
    total_no_match = 0

    for i, league in enumerate(LEAGUES):
        log.info(f"\n[{i+1}/{len(LEAGUES)}] {league}")

        players_data = fetch_understat(league)
        if not players_data:
            log.warning(f"  Skipping {league} — no data")
            if i < len(LEAGUES) - 1:
                log.info(f"  Waiting {RATE_LIMIT_SEC}s…")
                time.sleep(RATE_LIMIT_SEC)
            continue

        for item in players_data:
            u_name  = item.get("player_name", "")
            xg_val  = safe_float(item.get("xG"))
            xa_val  = safe_float(item.get("xA"))
            npxg    = safe_float(item.get("npxG"))
            minutes = safe_int(item.get("time"))
            games   = safe_int(item.get("games"))

            xgp90 = xg_per90(xg_val, minutes)

            pid = find_db_player(u_name, db_index_exact, db_index_last)

            if pid is None:
                log.debug(f"    NO MATCH  {u_name}")
                total_no_match += 1
                continue

            log.info(
                f"    MATCH  {u_name:<28}  "
                f"xG={xg_val:.2f}  xA={xa_val:.2f}  npxG={npxg:.2f}  "
                f"xG/90={xgp90}  games={games}"
            )

            if DRY_RUN:
                total_updated += 1
                continue

            ok = upsert_xg(pid, xg_val, xa_val, npxg)
            if ok:
                total_updated += 1
            else:
                total_skipped += 1
                log.warning(f"    UPSERT FAILED for {u_name} (id={pid})")

        # Respect Understat's rate limit between leagues
        if i < len(LEAGUES) - 1:
            log.info(f"  Waiting {RATE_LIMIT_SEC}s before next league…")
            time.sleep(RATE_LIMIT_SEC)

    # ── Summary ──────────────────────────────────────────────────────────────────
    log.info("\n=== Summary ===")
    log.info(f"  Updated   : {total_updated}")
    log.info(f"  No match  : {total_no_match}")
    log.info(f"  Errors    : {total_skipped}")
    if DRY_RUN:
        log.info("  (DRY-RUN — nothing written)")


if __name__ == "__main__":
    main()
