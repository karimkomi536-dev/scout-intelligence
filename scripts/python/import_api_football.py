"""
import_api_football.py — Fetch 2024-25 season players from API-Football and upsert to Supabase.

Usage:
    venv/Scripts/python import_api_football.py [--dry-run]

Leagues fetched (2024 season):
    61   Ligue 1 (France)
    60   Ligue 2 (France)
    39   Premier League (England)
    40   Championship (England)
    140  La Liga (Spain)
    78   Bundesliga (Germany)
    135  Serie A (Italy)

Limits:
    Min 500 minutes played filter.
    Max 80 players per league (4 pages x 20), ~560 total.
    Rate-limited: 2s between pages, 5s between leagues.
"""

import json
import logging
import os
import sys
import time
from typing import Optional

import requests
from dotenv import load_dotenv

# ── UTF-8 on Windows terminals (cp1252 can't handle accented player names) ────

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ── Env ───────────────────────────────────────────────────────────────────────

_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(_env_path)

API_KEY        = os.environ.get("API_FOOTBALL_KEY", "")
SUPABASE_URL   = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY   = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not API_KEY:
    log.error("API_FOOTBALL_KEY not found in .env — add it and retry.")
    sys.exit(1)
if not SUPABASE_URL or not SUPABASE_KEY:
    log.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

DRY_RUN   = "--dry-run" in sys.argv
SEASON    = 2024
SLEEP_BETWEEN_PAGES    = 2.0   # seconds between pagination requests
SLEEP_BETWEEN_LEAGUES  = 5.0   # seconds between leagues (API quota courtesy)
BATCH_SIZE = 25
MAX_PLAYERS_PER_LEAGUE = 80    # 4 pages x 20
MIN_MINUTES = 500              # skip players with insufficient playing time

LEAGUES = {
    61:  "Ligue 1",
    60:  "Ligue 2",
    39:  "Premier League",
    40:  "Championship",
    140: "La Liga",
    78:  "Bundesliga",
    135: "Serie A",
}

API_BASE = "https://api-football-v1.p.rapidapi.com/v3"
HEADERS  = {
    "x-rapidapi-key":  API_KEY,
    "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
}

# ── Position mapping ──────────────────────────────────────────────────────────
# API-Football returns broad position names. Map to VIZION's specific positions.

_POS_MAP = {
    "Goalkeeper": "GK",
    "Defender":   "CB",
    "Midfielder": "CM",
    "Attacker":   "ST",
}

# ── Scoring logic (mirrors src/utils/scoring.ts) ──────────────────────────────

_WEIGHTS: dict[str, dict[str, float]] = {
    "GK":  {"tactical": 0.40, "physical": 0.25, "mental": 0.20, "technique": 0.15},
    "CB":  {"tactical": 0.35, "physical": 0.25, "technique": 0.20, "mental": 0.20},
    "RB":  {"tactical": 0.35, "physical": 0.25, "technique": 0.20, "mental": 0.20},
    "LB":  {"tactical": 0.35, "physical": 0.25, "technique": 0.20, "mental": 0.20},
    "CDM": {"technique": 0.25, "mental": 0.25, "physical": 0.20, "tactical": 0.30},
    "CM":  {"technique": 0.30, "mental": 0.25, "physical": 0.20, "tactical": 0.25},
    "CAM": {"technique": 0.35, "mental": 0.30, "pace": 0.15, "physical": 0.10, "tactical": 0.10},
    "RW":  {"mental": 0.35, "pace": 0.25, "technique": 0.25, "physical": 0.15},
    "LW":  {"mental": 0.35, "pace": 0.25, "technique": 0.25, "physical": 0.15},
    "ST":  {"mental": 0.35, "pace": 0.25, "technique": 0.25, "physical": 0.15},
}
_DEFAULT_WEIGHTS: dict[str, float] = {
    "technique": 0.20, "physical": 0.20, "pace": 0.15, "mental": 0.20, "tactical": 0.25,
}
_LABEL_THRESHOLDS = [
    (75, "ELITE"),
    (60, "TOP PROSPECT"),
    (45, "INTERESTING"),
    (30, "TO MONITOR"),
    (0,  "LOW PRIORITY"),
]


def _calculate_score(individual_stats: dict, position: str) -> int:
    weights = _WEIGHTS.get(position, _DEFAULT_WEIGHTS)
    score = 0.0
    total_weight = 0.0
    for axis, weight in weights.items():
        score += individual_stats.get(axis, 0) * weight
        total_weight += weight
    raw = score / total_weight if total_weight > 0 else 0
    return round(min(100, max(0, raw)))


def _get_label(score: int) -> str:
    for threshold, label in _LABEL_THRESHOLDS:
        if score >= threshold:
            return label
    return "LOW PRIORITY"


# ── Stats normalisation helpers ───────────────────────────────────────────────

def _minmax(values: list[float]) -> list[float]:
    """Normalise a list of floats to [0, 100] range (min-max scaling)."""
    mn, mx = min(values), max(values)
    if mx == mn:
        return [50.0] * len(values)
    return [(v - mn) / (mx - mn) * 100 for v in values]


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _age_potential(age: Optional[int]) -> float:
    """Return a potential score 0-100 based solely on age."""
    if age is None:
        return 50.0
    if age <= 19: return 98.0
    if age <= 21: return 90.0
    if age <= 23: return 78.0
    if age <= 25: return 63.0
    if age <= 27: return 48.0
    if age <= 29: return 34.0
    if age <= 32: return 20.0
    return 10.0


# ── API helpers ───────────────────────────────────────────────────────────────

def _fetch_page(league_id: int, page: int) -> dict:
    """Fetch one page of players from API-Football. Returns full JSON response."""
    url = f"{API_BASE}/players"
    params = {"season": SEASON, "league": league_id, "page": page}
    resp = requests.get(url, headers=HEADERS, params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


def fetch_league_players(league_id: int, league_name: str) -> list[dict]:
    """
    Fetch up to MAX_PLAYERS_PER_LEAGUE players for a league.
    Respects API pagination (20 players/page) and the per-league cap.
    """
    collected: list[dict] = []
    page = 1

    while len(collected) < MAX_PLAYERS_PER_LEAGUE:
        log.info(f"  [{league_name}] page {page}…")
        try:
            data = _fetch_page(league_id, page)
        except requests.HTTPError as e:
            log.warning(f"  HTTP error on {league_name} page {page}: {e}")
            break

        # Check for API errors in body
        api_errors = data.get("errors", {})
        if api_errors:
            log.warning(f"  API error: {api_errors}")
            break

        response_items = data.get("response", [])
        if not response_items:
            break

        collected.extend(response_items)
        log.info(f"  [{league_name}] got {len(response_items)} players (total: {len(collected)})")

        paging = data.get("paging", {})
        if page >= paging.get("total", 1) or page >= MAX_PLAYERS_PER_LEAGUE // 20:
            break

        page += 1
        time.sleep(SLEEP_BETWEEN_PAGES)

    return collected[:MAX_PLAYERS_PER_LEAGUE]


# ── Player extraction ─────────────────────────────────────────────────────────

def _safe_int(v) -> int:
    try:
        return int(v or 0)
    except (ValueError, TypeError):
        return 0


def _safe_float(v) -> float:
    try:
        return float(v or 0.0)
    except (ValueError, TypeError):
        return 0.0


def extract_raw(item: dict, league_name: str) -> Optional[dict]:
    """
    Extract a flat raw-stat dict from one API-Football response item.
    Returns None if the player has too few appearances to be meaningful.
    """
    player_info = item.get("player", {})
    stats_list  = item.get("statistics", [])
    if not stats_list:
        return None

    s = stats_list[0]  # primary league stats

    appearances = _safe_int(s.get("games", {}).get("appearances"))
    minutes     = _safe_int(s.get("games", {}).get("minutes"))

    # Skip players with insufficient playing time
    if minutes < MIN_MINUTES:
        return None

    api_pos  = s.get("games", {}).get("position", "Midfielder")
    position = _POS_MAP.get(api_pos, "CM")

    # Raw stats
    goals      = _safe_int(s.get("goals", {}).get("total"))
    assists    = _safe_int(s.get("goals", {}).get("assists"))
    key_passes = _safe_int(s.get("passes", {}).get("key"))
    pass_acc   = _safe_float(s.get("passes", {}).get("accuracy"))  # already %
    tackles    = _safe_int(s.get("tackles", {}).get("total"))
    interceptions = _safe_int(s.get("tackles", {}).get("interceptions"))
    blocks     = _safe_int(s.get("tackles", {}).get("blocks"))
    drib_att   = _safe_int(s.get("dribbles", {}).get("attempts"))
    drib_ok    = _safe_int(s.get("dribbles", {}).get("success"))
    shots_tot  = _safe_int(s.get("shots", {}).get("total"))
    shots_on   = _safe_int(s.get("shots", {}).get("on"))

    # Per-90 stats
    nineties = (minutes / 90) if minutes > 0 else 1.0
    ga_p90   = (goals + assists)          / nineties
    def_p90  = (tackles + interceptions + blocks) / nineties
    kp_p90   = key_passes                 / nineties
    dr_p90   = drib_ok                    / nineties

    # Simple ratio stats (already 0-100 scale)
    drib_rate = (drib_ok / drib_att * 100) if drib_att > 0 else 50.0
    shot_acc  = (shots_on / shots_tot * 100) if shots_tot > 0 else 50.0

    return {
        # Identity
        "name":        player_info.get("name", ""),
        "age":         player_info.get("age"),
        "nationality": player_info.get("nationality", ""),
        "team":        s.get("team", {}).get("name", ""),
        "competition": league_name,
        "primary_position": position,
        # DB columns (direct)
        "minutes_played":    minutes,
        "appearances":       appearances,
        "goals":             goals,
        "assists":           assists,
        "tackles":           tackles,
        "interceptions":     interceptions,
        "blocks":            blocks,
        "key_passes":        key_passes,
        "pass_completion_rate": pass_acc,
        # Derived per-90 (for normalisation)
        "_ga_p90":    ga_p90,
        "_def_p90":   def_p90,
        "_kp_p90":    kp_p90,
        "_dr_p90":    dr_p90,
        "_drib_rate": drib_rate,
        "_shot_acc":  shot_acc,
        "_minutes":   minutes,
        "_pass_acc":  pass_acc,
    }


# ── Axis normalisation across the full dataset ────────────────────────────────

def compute_individual_stats(players: list[dict]) -> list[dict]:
    """
    Compute normalised individual_stats (0-100 per axis) for all players.
    Uses min-max normalisation within the collected dataset for per-90 stats.
    Returns the same list augmented with 'individual_stats', 'scout_score', 'scout_label'.
    """
    if not players:
        return players

    def col(key: str) -> list[float]:
        return [p[key] for p in players]

    # Normalise per-90 stats across the dataset (0-100)
    ga_norm  = _minmax(col("_ga_p90"))
    def_norm = _minmax(col("_def_p90"))
    kp_norm  = _minmax(col("_kp_p90"))
    dr_norm  = _minmax(col("_dr_p90"))
    min_norm = _minmax(col("_minutes"))

    for i, p in enumerate(players):
        # technique  = pass accuracy (direct %) + key passes per 90 (normalised)
        technique = _clamp(0.60 * p["_pass_acc"] + 0.40 * kp_norm[i])

        # physical   = minutes share (fitness proxy) + slight raw physical load
        physical  = _clamp(0.80 * min_norm[i] + 0.20 * def_norm[i])

        # pace       = dribbling success rate + dribbles per 90
        pace      = _clamp(0.50 * p["_drib_rate"] + 0.50 * dr_norm[i])

        # mental     = goals+assists per 90 + shot accuracy
        mental    = _clamp(0.70 * ga_norm[i] + 0.30 * p["_shot_acc"])

        # tactical   = defensive actions per 90 (tackles + interceptions + blocks)
        tactical  = _clamp(def_norm[i])

        # potential  = age bonus (static, not used in score weight)
        potential = _age_potential(p.get("age"))

        individual_stats = {
            "technique": round(technique),
            "physical":  round(physical),
            "pace":      round(pace),
            "mental":    round(mental),
            "tactical":  round(tactical),
            "potential": round(potential),
        }

        score = _calculate_score(individual_stats, p["primary_position"])
        label = _get_label(score)

        p["individual_stats"] = json.dumps(individual_stats)
        p["scout_score"]      = score
        p["scout_label"]      = label

    return players


# ── Supabase upsert ───────────────────────────────────────────────────────────

# Columns that exist in the Supabase players table
_DB_COLUMNS = [
    "name", "age", "team", "primary_position", "competition",
    "nationality", "scout_score", "scout_label",
    "minutes_played", "appearances", "goals", "assists",
    "tackles", "interceptions", "blocks",
    "key_passes", "pass_completion_rate",
    "individual_stats",
]


def _to_db_row(p: dict) -> dict:
    """Strip internal underscore keys and keep only DB columns."""
    row = {}
    for col in _DB_COLUMNS:
        val = p.get(col)
        # Convert None-able ints/floats safely
        if val is None:
            row[col] = None
        elif col == "individual_stats":
            row[col] = val  # already JSON string
        else:
            row[col] = val
    return row


def upsert_players(players: list[dict]) -> dict:
    """
    Upsert all players to Supabase in batches of BATCH_SIZE.
    Match strategy: update if (name, team) exists, insert otherwise.
    """
    from supabase import create_client

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Pre-load existing (name, team) pairs
    try:
        resp = client.table("players").select("name,team").execute()
        existing = {(r["name"], r.get("team", "")) for r in (resp.data or [])}
        log.info(f"Found {len(existing)} existing players in Supabase")
    except Exception as e:
        log.warning(f"Could not pre-fetch existing players: {e}")
        existing = set()

    rows = [_to_db_row(p) for p in players]
    inserted = updated = errors = 0
    error_details: list[str] = []
    total_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE

    for bi in range(total_batches):
        batch = rows[bi * BATCH_SIZE: (bi + 1) * BATCH_SIZE]
        log.info(f"Batch {bi + 1}/{total_batches}: {len(batch)} players…")

        for row in batch:
            name = row.get("name", "?")
            team = row.get("team", "?")
            key  = (name, team)
            try:
                if key in existing:
                    client.table("players").update(row).eq("name", name).eq("team", team).execute()
                    updated += 1
                    log.info(f"  UPDATE  {name} ({team})")
                else:
                    client.table("players").insert(row).execute()
                    existing.add(key)
                    inserted += 1
                    log.info(f"  INSERT  {name} ({team})")
            except Exception as e:
                errors += 1
                msg = f"{name} ({team}): {e}"
                error_details.append(msg)
                log.warning(f"  ERROR   {msg}")

    return {"inserted": inserted, "updated": updated, "errors": errors, "error_details": error_details}


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("=" * 60)
    log.info("VIZION — API-Football import  (season %d)", SEASON)
    if DRY_RUN:
        log.info("[DRY-RUN mode — no writes to Supabase]")
    log.info("=" * 60)

    all_raw: list[dict] = []

    for league_id, league_name in LEAGUES.items():
        log.info(f"\nFetching {league_name} (id={league_id})…")
        items = fetch_league_players(league_id, league_name)
        log.info(f"  -> {len(items)} raw entries received")

        for item in items:
            raw = extract_raw(item, league_name)
            if raw and raw["name"]:
                all_raw.append(raw)

        time.sleep(SLEEP_BETWEEN_LEAGUES)  # pause between leagues

    log.info(f"\nTotal players extracted after filtering: {len(all_raw)}")

    if not all_raw:
        log.warning("No players collected — check your API key and league IDs.")
        return

    # Compute individual_stats + scores across entire dataset
    players = compute_individual_stats(all_raw)

    # Label distribution summary
    from collections import Counter
    label_counts = Counter(p["scout_label"] for p in players)
    log.info("\nLabel distribution:")
    for label in ["ELITE", "TOP PROSPECT", "INTERESTING", "TO MONITOR", "LOW PRIORITY"]:
        n = label_counts.get(label, 0)
        log.info(f"  {label:<15} {n:>3}  {'|' * (n // 3)}")

    # League distribution
    league_counts = Counter(p["competition"] for p in players)
    log.info("\nBy league:")
    for league, count in league_counts.most_common():
        log.info(f"  {league:<20} {count} players")

    if DRY_RUN:
        log.info("\n[DRY-RUN] Would upsert %d players — skipping DB write.", len(players))
        # Show sample
        sample = players[:3]
        for p in sample:
            log.info(
                "  SAMPLE: %s (%s) | %s | score=%d | %s",
                p["name"], p["team"], p["primary_position"],
                p["scout_score"], p["scout_label"],
            )
        return

    # Upsert to Supabase
    log.info(f"\nUpserting {len(players)} players to Supabase…")
    result = upsert_players(players)

    # Final summary
    print("\n" + "=" * 60)
    print("VIZION — Import Summary")
    print("=" * 60)
    print(f"  Players fetched   : {len(players)}")
    print(f"  Inserted          : {result['inserted']}")
    print(f"  Updated           : {result['updated']}")
    print(f"  Errors            : {result['errors']}")
    if result["error_details"]:
        print("\n  Error details:")
        for msg in result["error_details"][:5]:
            print(f"    - {msg}")
        if len(result["error_details"]) > 5:
            print(f"    ... and {len(result['error_details']) - 5} more")
    print("=" * 60)


if __name__ == "__main__":
    main()
