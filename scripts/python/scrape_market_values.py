"""
scrape_market_values.py — Fetch Transfermarkt market values for all players in DB.

Usage:
    venv/Scripts/python scrape_market_values.py [--dry-run]

Strategy:
    For each player in Supabase, search Transfermarkt by name and parse the
    market value from the first result. Rate-limited to 1 req / 3 s to avoid
    being blocked.

Value formats handled:
    "12,00 Mio. €" → 12_000_000
    "500 Tsd. €"   → 500_000
    "1,50 Mrd. €"  → 1_500_000_000   (billion — edge case)
"""

import os
import re
import sys
import time
import logging
from datetime import date

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# ── Setup ─────────────────────────────────────────────────────────────────────

# Force UTF-8 on Windows terminals (cp1252 can't handle accented player names)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(_env_path)

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
# Scraper needs service_role to bypass RLS for writes
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    or ""
)

if not SUPABASE_URL or not SUPABASE_KEY:
    log.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

DRY_RUN    = "--dry-run" in sys.argv
SLEEP_SEC  = 3           # polite rate limit between TM requests
TODAY      = date.today().isoformat()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

# ── Supabase REST helpers ─────────────────────────────────────────────────────

def sb_get(path: str, params: dict | None = None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    r = requests.get(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    }, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def sb_patch(path: str, data: dict, match_params: dict):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    r = requests.patch(url, json=data, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, params=match_params, timeout=20)
    r.raise_for_status()

def sb_post(path: str, data: dict | list):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    r = requests.post(url, json=data, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, timeout=20)
    r.raise_for_status()

# ── Market value parsing ──────────────────────────────────────────────────────

def parse_market_value(raw: str) -> int | None:
    """
    Convert a Transfermarkt value string to an integer (EUR).

    Examples:
        "12,00 Mio. €"  → 12_000_000
        "500 Tsd. €"    → 500_000
        "1,50 Mrd. €"   → 1_500_000_000
    """
    raw = raw.strip().replace("\xa0", " ")
    # Extract numeric part (handles "12,00" and "12.00" and "500")
    m = re.search(r"([\d.,]+)", raw)
    if not m:
        return None
    num_str = m.group(1).replace(",", ".")
    try:
        num = float(num_str)
    except ValueError:
        return None

    raw_upper = raw.upper()
    if "MRD" in raw_upper:
        return int(num * 1_000_000_000)
    if "MIO" in raw_upper or "MIL" in raw_upper or "M" in raw_upper:
        return int(num * 1_000_000)
    if "TSD" in raw_upper or "K" in raw_upper:
        return int(num * 1_000)
    # Bare number — assume euros
    return int(num)

# ── Transfermarkt search ──────────────────────────────────────────────────────

TM_SEARCH_URL = "https://www.transfermarkt.fr/schnellsuche/ergebnis/schnellsuche"

def fetch_market_value(name: str) -> int | None:
    """
    Search Transfermarkt for `name` and return the market value in EUR,
    or None if not found / parse fails.
    """
    try:
        r = requests.get(
            TM_SEARCH_URL,
            params={"query": name, "Spieler_page": "0"},
            headers=HEADERS,
            timeout=15,
        )
        if r.status_code != 200:
            log.warning("TM returned HTTP %s for %r", r.status_code, name)
            return None
    except requests.RequestException as exc:
        log.warning("Request error for %r: %s", name, exc)
        return None

    soup = BeautifulSoup(r.text, "lxml")

    # TM search page has multiple result boxes (players, clubs, etc.).
    # The players box has id="yw1" or is the first box with table.items.
    # Try id="yw1" first (most reliable), then fall back to first table.
    player_table = soup.select_one("#yw1 table.items") or soup.select_one("div.box table.items")
    if not player_table:
        log.debug("No player results table for %r", name)
        return None

    rows = player_table.select("tbody tr")
    if not rows:
        return None

    # Iterate rows — skip ad/separator rows (they have no td.hauptlink)
    for row in rows[:3]:  # check top 3 results max
        # Market value: <td class="rechts hauptlink"> (NOT the last td.rechts which is the agent)
        value_cell = row.select_one("td.rechts.hauptlink")
        if not value_cell:
            continue
        raw_value = value_cell.get_text(strip=True)
        if not raw_value or raw_value in ("-", "—", ""):
            continue
        parsed = parse_market_value(raw_value)
        if parsed and parsed > 0:
            return parsed

    return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    log.info("=== scrape_market_values.py %s===", "[DRY RUN] " if DRY_RUN else "")

    # Fetch all players (id + name + current market_value_eur)
    players = sb_get("players", {"select": "id,name,market_value_eur", "order": "name.asc"})
    log.info("Loaded %d players from Supabase", len(players))

    updated = 0
    not_found = 0

    for i, player in enumerate(players):
        pid   = player["id"]
        name  = player["name"]
        prev  = player.get("market_value_eur")

        log.info("[%d/%d] %s", i + 1, len(players), name)

        value = fetch_market_value(name)

        if value is None:
            log.warning("  -> Not found on Transfermarkt")
            not_found += 1
        else:
            log.info("  -> %s EUR  (prev: %s)", f"{value:,}", f"{prev:,}" if prev else "—")

            if not DRY_RUN:
                # Update players.market_value_eur
                sb_patch("players", {"market_value_eur": value}, {"id": f"eq.{pid}"})

                # Insert snapshot into market_value_history
                sb_post("market_value_history", {
                    "player_id":   pid,
                    "value_eur":   value,
                    "source":      "transfermarkt",
                    "recorded_at": TODAY,
                })
            updated += 1

        if i < len(players) - 1:
            time.sleep(SLEEP_SEC)

    log.info(
        "Done. Updated: %d  |  Not found: %d  |  Total: %d",
        updated, not_found, len(players),
    )
    if DRY_RUN:
        log.info("DRY RUN — no writes made.")

if __name__ == "__main__":
    main()
