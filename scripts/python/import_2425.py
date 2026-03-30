"""
import_2425.py — Import 2024-25 saison, zéro doublon.

Source de données : API-Football (RapidAPI)
  - FBref est bloqué par Cloudflare (HTTP 403) et soccerdata est
    incompatible avec Python 3.14. API-Football est la seule source
    fiable pour les données 2024-25.

Stratégie anti-doublon (3 niveaux) :
  1. Déduplication en mémoire (normalize avant de constituer la liste)
  2. Matching en DB via forme normalisée (sans accents, lowercase, sans ponctuation)
  3. Index UNIQUE fonctionnel en DB (exécuter dedup-migration.sql en amont)

Usage:
  venv\\Scripts\\python import_2425.py [--dry-run]
"""

import json
import logging
import os
import re
import sys
import time
import unicodedata
from collections import Counter
from typing import Optional

import requests
from dotenv import load_dotenv

# ── UTF-8 sur Windows ─────────────────────────────────────────────────────────

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

API_KEY      = os.environ.get("API_FOOTBALL_KEY", "")
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not API_KEY:
    log.error("API_FOOTBALL_KEY not found in .env — ajoutez-le et relancez.")
    sys.exit(1)
if not SUPABASE_URL or not SUPABASE_KEY:
    log.error("VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env")
    sys.exit(1)

DRY_RUN = "--dry-run" in sys.argv

SEASON                 = 2024
SLEEP_BETWEEN_PAGES    = 2.0
SLEEP_BETWEEN_LEAGUES  = 5.0
MAX_PLAYERS_PER_LEAGUE = 80
MIN_MINUTES            = 500
BATCH_SIZE             = 25

LEAGUES = {
    61:  {"name": "Ligue 1",        "country": "France"},
    60:  {"name": "Ligue 2",        "country": "France"},
    39:  {"name": "Premier League", "country": "England"},
    40:  {"name": "Championship",   "country": "England"},
    140: {"name": "La Liga",        "country": "Spain"},
    78:  {"name": "Bundesliga",     "country": "Germany"},
    135: {"name": "Serie A",        "country": "Italy"},
}

API_BASE = "https://api-football-v1.p.rapidapi.com/v3"
HEADERS  = {
    "x-rapidapi-key":  API_KEY,
    "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
}

_POS_MAP = {
    "Goalkeeper": "GK",
    "Defender":   "CB",
    "Midfielder": "CM",
    "Attacker":   "ST",
}

# ═══ NORMALISATION ════════════════════════════════════════════════════════════

def normalize(text: str) -> str:
    """Normalise un texte : minuscules, sans accents, sans caractères spéciaux."""
    if not text:
        return ""
    nfd = unicodedata.normalize("NFD", str(text))
    ascii_text = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    clean = re.sub(r"[^a-z0-9 ]", "", ascii_text.lower())
    return re.sub(r"\s+", " ", clean).strip()

# ═══ SCORING ══════════════════════════════════════════════════════════════════

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
    score = total_w = 0.0
    for axis, w in weights.items():
        score += individual_stats.get(axis, 0) * w
        total_w += w
    raw = score / total_w if total_w > 0 else 0
    return round(min(100, max(0, raw)))


def _get_label(score: int) -> str:
    for threshold, label in _LABEL_THRESHOLDS:
        if score >= threshold:
            return label
    return "LOW PRIORITY"


def _age_potential(age: Optional[int]) -> float:
    if age is None: return 50.0
    if age <= 19:   return 98.0
    if age <= 21:   return 90.0
    if age <= 23:   return 78.0
    if age <= 25:   return 63.0
    if age <= 27:   return 48.0
    if age <= 29:   return 34.0
    if age <= 32:   return 20.0
    return 10.0

# ═══ API-FOOTBALL ═════════════════════════════════════════════════════════════

def _safe_int(v) -> int:
    try: return int(v or 0)
    except: return 0

def _safe_float(v) -> float:
    try: return float(v or 0.0)
    except: return 0.0

def _minmax(values: list[float]) -> list[float]:
    mn, mx = min(values), max(values)
    if mx == mn:
        return [50.0] * len(values)
    return [(v - mn) / (mx - mn) * 100 for v in values]

def _clamp(v: float) -> float:
    return max(0.0, min(100.0, v))


def fetch_league_players(league_id: int, league_name: str) -> list[dict]:
    """Récupère MAX_PLAYERS_PER_LEAGUE joueurs pour une ligue via API-Football."""
    collected = []
    page = 1

    while len(collected) < MAX_PLAYERS_PER_LEAGUE:
        log.info(f"  [{league_name}] page {page}...")
        try:
            resp = requests.get(
                f"{API_BASE}/players",
                headers=HEADERS,
                params={"season": SEASON, "league": league_id, "page": page},
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.HTTPError as e:
            log.warning(f"  HTTP error {league_name} page {page}: {e}")
            break

        api_errors = data.get("errors", {})
        if api_errors:
            log.warning(f"  API error: {api_errors}")
            break

        items = data.get("response", [])
        if not items:
            break

        collected.extend(items)
        log.info(f"  [{league_name}] +{len(items)} (total: {len(collected)})")

        paging = data.get("paging", {})
        if page >= paging.get("total", 1) or page >= MAX_PLAYERS_PER_LEAGUE // 20:
            break

        page += 1
        time.sleep(SLEEP_BETWEEN_PAGES)

    return collected[:MAX_PLAYERS_PER_LEAGUE]


def extract_raw(item: dict, league_name: str) -> Optional[dict]:
    """Extrait un dict plat depuis un item API-Football. Retourne None si < MIN_MINUTES."""
    player_info = item.get("player", {})
    stats_list  = item.get("statistics", [])
    if not stats_list:
        return None

    s = stats_list[0]
    minutes     = _safe_int(s.get("games", {}).get("minutes"))
    appearances = _safe_int(s.get("games", {}).get("appearances"))

    if minutes < MIN_MINUTES:
        return None

    api_pos  = s.get("games", {}).get("position", "Midfielder")
    position = _POS_MAP.get(api_pos, "CM")

    goals      = _safe_int(s.get("goals",   {}).get("total"))
    assists    = _safe_int(s.get("goals",   {}).get("assists"))
    key_passes = _safe_int(s.get("passes",  {}).get("key"))
    pass_acc   = _safe_float(s.get("passes", {}).get("accuracy"))
    tackles    = _safe_int(s.get("tackles", {}).get("total"))
    interceptions = _safe_int(s.get("tackles", {}).get("interceptions"))
    blocks     = _safe_int(s.get("tackles", {}).get("blocks"))
    drib_att   = _safe_int(s.get("dribbles", {}).get("attempts"))
    drib_ok    = _safe_int(s.get("dribbles", {}).get("success"))
    shots_tot  = _safe_int(s.get("shots", {}).get("total"))
    shots_on   = _safe_int(s.get("shots", {}).get("on"))

    nineties  = (minutes / 90) if minutes > 0 else 1.0
    ga_p90    = (goals + assists)                     / nineties
    def_p90   = (tackles + interceptions + blocks)    / nineties
    kp_p90    = key_passes                            / nineties
    dr_p90    = drib_ok                               / nineties
    drib_rate = (drib_ok / drib_att * 100) if drib_att > 0 else 50.0
    shot_acc  = (shots_on / shots_tot * 100) if shots_tot > 0 else 50.0

    name = player_info.get("name", "").strip()
    team = (s.get("team", {}).get("name") or "").strip()

    return {
        "name":               name,
        "team":               team,
        "age":                player_info.get("age"),
        "nationality":        player_info.get("nationality", ""),
        "competition":        league_name,
        "primary_position":   position,
        "minutes_played":     minutes,
        "appearances":        appearances,
        "goals":              goals,
        "assists":            assists,
        "tackles":            tackles,
        "interceptions":      interceptions,
        "blocks":             blocks,
        "key_passes":         key_passes,
        "pass_completion_rate": pass_acc,
        # Colonnes normalisées (pour dedup en DB)
        "name_normalized":    normalize(name),
        "team_normalized":    normalize(team),
        # Internes pour le calcul du score
        "_ga_p90":    ga_p90,
        "_def_p90":   def_p90,
        "_kp_p90":    kp_p90,
        "_dr_p90":    dr_p90,
        "_minutes":   minutes,
        "_pass_acc":  pass_acc,
        "_drib_rate": drib_rate,
        "_shot_acc":  shot_acc,
    }


def compute_individual_stats(players: list[dict]) -> list[dict]:
    """Calcule individual_stats + scout_score + scout_label pour tous les joueurs."""
    if not players:
        return players

    def col(k): return [p[k] for p in players]

    ga_norm  = _minmax(col("_ga_p90"))
    def_norm = _minmax(col("_def_p90"))
    kp_norm  = _minmax(col("_kp_p90"))
    dr_norm  = _minmax(col("_dr_p90"))
    min_norm = _minmax(col("_minutes"))

    for i, p in enumerate(players):
        technique = _clamp(0.60 * p["_pass_acc"] + 0.40 * kp_norm[i])
        physical  = _clamp(0.80 * min_norm[i]    + 0.20 * def_norm[i])
        pace      = _clamp(0.50 * p["_drib_rate"] + 0.50 * dr_norm[i])
        mental    = _clamp(0.70 * ga_norm[i]      + 0.30 * p["_shot_acc"])
        tactical  = _clamp(def_norm[i])
        potential = _age_potential(p.get("age"))

        ind = {
            "technique": round(technique),
            "physical":  round(physical),
            "pace":      round(pace),
            "mental":    round(mental),
            "tactical":  round(tactical),
            "potential": round(potential),
        }
        score = _calculate_score(ind, p["primary_position"])
        p["individual_stats"] = json.dumps(ind)
        p["scout_score"]      = score
        p["scout_label"]      = _get_label(score)

    return players

# ═══ DÉDUPLICATION EN MÉMOIRE ═════════════════════════════════════════════════

def deduplicate(players: list[dict]) -> tuple[list[dict], int]:
    """
    Déduplique en mémoire par clé (name_normalized, team_normalized).
    Retourne (liste_dédupliquée, nb_doublons_retirés).
    """
    seen: dict[tuple, dict] = {}
    for p in players:
        key = (p["name_normalized"], p["team_normalized"])
        if key not in seen:
            seen[key] = p
        # Si doublon : on garde le premier (généralement la ligue principale)
    duplicates_removed = len(players) - len(seen)
    return list(seen.values()), duplicates_removed

# ═══ UPSERT SUPABASE ══════════════════════════════════════════════════════════

_DB_COLUMNS = [
    "name", "age", "team", "primary_position", "competition",
    "nationality", "scout_score", "scout_label", "individual_stats",
    "minutes_played", "appearances", "goals", "assists",
    "tackles", "interceptions", "blocks", "key_passes", "pass_completion_rate",
    "name_normalized", "team_normalized",
]


def _to_db_row(p: dict) -> dict:
    return {col: p.get(col) for col in _DB_COLUMNS}


def upsert_all(players: list[dict]) -> dict:
    """
    Upsert tous les joueurs.
    Matching par forme normalisée — gère N'Golo Kanté vs Ngolo Kante.
    Pré-charge tous les joueurs existants une seule fois (O(n+m) au lieu de O(n*m)).
    """
    from supabase import create_client

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Pré-charge l'index normalisé des joueurs existants
    try:
        resp = client.table("players").select("id, name, team").execute()
        existing: dict[tuple, str] = {}
        for r in resp.data or []:
            key = (normalize(r.get("name", "")), normalize(r.get("team", "")))
            existing[key] = r["id"]
        log.info(f"Index DB : {len(existing)} joueurs existants")
    except Exception as e:
        log.warning(f"Impossible de pre-charger les joueurs existants : {e}")
        existing = {}

    inserted = updated = errors = 0
    error_details: list[str] = []
    total = len(players)

    for i, player in enumerate(players):
        name = player.get("name", "?")
        team = player.get("team", "?")
        key  = (player["name_normalized"], player["team_normalized"])
        row  = _to_db_row(player)

        try:
            if key in existing:
                client.table("players").update(row).eq("id", existing[key]).execute()
                updated += 1
                if updated <= 5:
                    log.info(f"  UPDATE  {name} ({team})")
            else:
                client.table("players").insert(row).execute()
                inserted += 1
                if inserted <= 5:
                    log.info(f"  INSERT  {name} ({team})")
        except Exception as e:
            errors += 1
            msg = f"{name} ({team}): {e}"
            error_details.append(msg)
            log.warning(f"  ERROR   {msg}")

        if (i + 1) % BATCH_SIZE == 0:
            log.info(f"  Progress : {i+1}/{total}")

    return {"inserted": inserted, "updated": updated, "errors": errors, "error_details": error_details}

# ═══ MAIN ════════════════════════════════════════════════════════════════════

def main() -> None:
    print("=" * 60)
    print("VIZION — Import 2024-25 (API-Football, zéro doublon)")
    print("DRY-RUN" if DRY_RUN else "PRODUCTION")
    print("=" * 60)

    # Étape 1 : Fetch toutes les ligues
    all_raw: list[dict] = []
    for league_id, meta in LEAGUES.items():
        league_name = meta["name"]
        log.info(f"\nFetch {league_name} (id={league_id})...")
        items = fetch_league_players(league_id, league_name)
        log.info(f"  -> {len(items)} entrees recues")

        for item in items:
            raw = extract_raw(item, league_name)
            if raw and raw["name"]:
                all_raw.append(raw)

        time.sleep(SLEEP_BETWEEN_LEAGUES)

    log.info(f"\nTotal extrait apres filtre {MIN_MINUTES}min : {len(all_raw)} joueurs")

    if not all_raw:
        log.warning("Aucun joueur collecte -- verifiez la cle API et les league IDs.")
        return

    # Étape 2 : Déduplication en mémoire
    deduped, n_dupes = deduplicate(all_raw)
    log.info(f"Apres deduplication : {len(deduped)} joueurs uniques ({n_dupes} doublons retires)")

    # Étape 3 : Calcul des scores
    players = compute_individual_stats(deduped)

    # Distribution des labels
    label_counts = Counter(p["scout_label"] for p in players)
    log.info("\nDistribution labels :")
    for label in ["ELITE", "TOP PROSPECT", "INTERESTING", "TO MONITOR", "LOW PRIORITY"]:
        n = label_counts.get(label, 0)
        log.info(f"  {label:<15} {n:>3}")

    # Distribution par ligue
    league_counts = Counter(p["competition"] for p in players)
    log.info("\nPar ligue :")
    for league, count in sorted(league_counts.items(), key=lambda x: -x[1]):
        log.info(f"  {league:<20} {count} joueurs")

    if DRY_RUN:
        log.info("\n[DRY-RUN] Apercu des 10 premiers joueurs :")
        for p in players[:10]:
            log.info(
                "  %s (%s) | %s | %s | score=%d %s",
                p["name"], p["team"], p["competition"],
                p["primary_position"], p["scout_score"], p["scout_label"],
            )

        # Vérification indicateurs 2024-25
        ligue1 = [p for p in players if p["competition"] == "Ligue 1"]
        log.info(f"\nLigue 1 : {len(ligue1)} joueurs (2024-25 = API-Football season=2024)")
        log.info("Premiers joueurs Ligue 1 :")
        for p in ligue1[:5]:
            log.info(f"  {p['name']} -- {p['team']}")
        return

    # Étape 4 : Upsert Supabase
    log.info(f"\nUpsert {len(players)} joueurs vers Supabase...")
    result = upsert_all(players)

    print("\n" + "=" * 60)
    print("RÉSUMÉ FINAL")
    print("=" * 60)
    print(f"  Inseres           : {result['inserted']}")
    print(f"  Mis a jour        : {result['updated']}")
    print(f"  Doublons retires  : {n_dupes}")
    print(f"  Erreurs           : {result['errors']}")
    if result["error_details"]:
        print("\n  Détail erreurs :")
        for msg in result["error_details"][:5]:
            print(f"    - {msg}")
        if len(result["error_details"]) > 5:
            print(f"    ... et {len(result['error_details']) - 5} autres")
    print("=" * 60)


if __name__ == "__main__":
    main()
