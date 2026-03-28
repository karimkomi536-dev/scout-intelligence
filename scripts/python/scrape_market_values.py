"""
scrape_market_values.py — Fetch Transfermarkt market values, detect transfers,
and scrape contract end dates for all players in DB.

Usage:
    venv/Scripts/python scrape_market_values.py [--dry-run] [--no-contracts]

Flags:
    --dry-run        Log what would happen but make no writes to Supabase
    --no-contracts   Skip the player-profile request (faster, no contract_end data)

Strategy:
    For each player in Supabase:
      1. Search Transfermarkt by name
         → parse market value, current club, player profile URL
      2. Unless --no-contracts: fetch player profile page
         → parse contract end date
      3. Detect transfer: current club != DB team → create notification
      4. Detect contract expiry: contract_end within 6 months → create notification
         (only for users who have this player in their shortlist)
      5. Write updated values back to Supabase

Value formats handled:
    "12,00 Mio. €"  → 12_000_000
    "500 Tsd. €"    → 500_000
    "1,50 Mrd. €"   → 1_500_000_000
"""

import os
import re
import sys
import time
import logging
from datetime import date, timedelta

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# ── Setup ─────────────────────────────────────────────────────────────────────

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
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    log.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

DRY_RUN       = "--dry-run"       in sys.argv
SKIP_CONTRACTS = "--no-contracts" in sys.argv
SLEEP_SEC     = 3
CONTRACT_WARN_DAYS = 180          # 6 months
TODAY         = date.today()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

TM_BASE       = "https://www.transfermarkt.fr"
TM_SEARCH_URL = f"{TM_BASE}/schnellsuche/ergebnis/schnellsuche"

# ── Supabase REST helpers ─────────────────────────────────────────────────────

def _headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    }

def sb_get(path: str, params: dict | None = None) -> list[dict]:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=_headers(),
        params=params,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()

def sb_patch(path: str, data: dict, match_params: dict) -> None:
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{path}",
        json=data,
        headers={**_headers(), "Content-Type": "application/json", "Prefer": "return=minimal"},
        params=match_params,
        timeout=20,
    )
    r.raise_for_status()

def sb_post(path: str, data: dict | list) -> None:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{path}",
        json=data,
        headers={**_headers(), "Content-Type": "application/json", "Prefer": "return=minimal"},
        timeout=20,
    )
    r.raise_for_status()

# ── Date parsing ──────────────────────────────────────────────────────────────

FRENCH_MONTHS: dict[str, int] = {
    "janvier": 1, "fevrier": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "aout": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12,
    # with accents normalised via .replace below
    "f\xe9vrier": 2, "ao\xfbt": 8, "d\xe9cembre": 12,
}

def parse_date_french(text: str) -> date | None:
    """
    Parse a Transfermarkt date string (French or numeric) to a date object.

    Handles:
        "30 juin 2026"
        "30.06.2026"  /  "30/06/2026"
        "Jun 30, 2026"  (English fallback)
    """
    text = text.strip().lower()

    # Normalise French accents for the month lookup
    text_norm = (text
                 .replace("\xe9", "e")
                 .replace("\xfb", "u")
                 .replace("\xe8", "e")
                 .replace("\xf4", "o"))

    # Pattern: "30 juin 2026"
    m = re.search(r"(\d{1,2})\s+([a-z\xe9\xfb\xe8]+)\s+(\d{4})", text_norm)
    if m:
        day, month_name, year = int(m.group(1)), m.group(2), int(m.group(3))
        month = FRENCH_MONTHS.get(month_name)
        if month:
            try:
                return date(year, month, day)
            except ValueError:
                pass

    # Pattern: "30.06.2026" or "30/06/2026"
    m = re.search(r"(\d{1,2})[./](\d{1,2})[./](\d{4})", text)
    if m:
        day, mon, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return date(year, mon, day)
        except ValueError:
            pass

    # English month name fallback
    en_months = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    m = re.search(r"([a-z]{3})\.?\s+(\d{1,2}),?\s+(\d{4})", text)
    if m:
        mon_abbr, day, year = m.group(1), int(m.group(2)), int(m.group(3))
        month = en_months.get(mon_abbr)
        if month:
            try:
                return date(year, month, day)
            except ValueError:
                pass

    return None

# ── Market value parsing ──────────────────────────────────────────────────────

def parse_market_value(raw: str) -> int | None:
    raw = raw.strip().replace("\xa0", " ")
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
    if "MIO" in raw_upper or "MIL" in raw_upper or "M " in raw_upper or raw_upper.endswith("M"):
        return int(num * 1_000_000)
    if "TSD" in raw_upper or "K" in raw_upper:
        return int(num * 1_000)
    return int(num)

# ── Transfermarkt scraping ────────────────────────────────────────────────────

def fetch_player_data(name: str) -> dict:
    """
    Search Transfermarkt for `name`.

    Returns a dict with keys:
        value        : int | None    — market value in EUR
        club         : str | None    — current club name
        profile_path : str | None    — TM path e.g. '/name/profil/spieler/12345'
    """
    result: dict = {"value": None, "club": None, "profile_path": None}

    try:
        r = requests.get(
            TM_SEARCH_URL,
            params={"query": name, "Spieler_page": "0"},
            headers=HEADERS,
            timeout=15,
        )
        if r.status_code != 200:
            log.warning("TM search HTTP %s for %r", r.status_code, name)
            return result
    except requests.RequestException as exc:
        log.warning("Request error for %r: %s", name, exc)
        return result

    soup = BeautifulSoup(r.text, "lxml")

    # Players box: id="yw1" → table.items
    player_table = (
        soup.select_one("#yw1 table.items")
        or soup.select_one("div.box table.items")
    )
    if not player_table:
        log.debug("No player table for %r", name)
        return result

    rows = player_table.select("tbody tr")
    if not rows:
        return result

    for row in rows[:3]:
        # ── Market value ───────────────────────────────────────────────────
        value_cell = row.select_one("td.rechts.hauptlink")
        if value_cell:
            raw_value = value_cell.get_text(strip=True)
            if raw_value and raw_value not in ("-", "—", ""):
                parsed_value = parse_market_value(raw_value)
                if parsed_value and parsed_value > 0:
                    result["value"] = parsed_value

        # ── Player profile URL ─────────────────────────────────────────────
        name_cell = row.select_one("td.hauptlink a[href*='/spieler/']")
        if name_cell and not result["profile_path"]:
            href = name_cell.get("href", "")
            if "/spieler/" in href:
                result["profile_path"] = href.split("?")[0]

        # ── Current club ───────────────────────────────────────────────────
        # The club cell contains an <a> with href containing '/startseite/verein/'
        club_link = row.select_one("a[href*='startseite/verein']")
        if club_link and not result["club"]:
            club_name = club_link.get_text(strip=True)
            if club_name:
                result["club"] = club_name

        # Stop once we have all three
        if result["value"] and result["profile_path"] and result["club"]:
            break

    return result


def fetch_contract_end(profile_path: str) -> date | None:
    """
    Fetch a player's TM profile page and extract their contract end date.
    Returns None on any failure.
    """
    url = f"{TM_BASE}{profile_path}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            log.debug("TM profile HTTP %s for %s", r.status_code, url)
            return None
    except requests.RequestException as exc:
        log.debug("Profile request error for %s: %s", url, exc)
        return None

    soup = BeautifulSoup(r.text, "lxml")

    # Pattern A: data-header labels (common in newer TM layout)
    for label_el in soup.select(
        "span.data-header__label, li.data-header__label, p.data-header__label"
    ):
        label_text = label_el.get_text(strip=True).lower()
        if "contrat" in label_text or "contract" in label_text:
            sibling = label_el.find_next_sibling()
            if sibling:
                parsed = parse_date_french(sibling.get_text(strip=True))
                if parsed:
                    return parsed

    # Pattern B: info-table (older TM layout)
    for dt in soup.select("dt"):
        if "contrat" in dt.get_text(strip=True).lower():
            dd = dt.find_next_sibling("dd")
            if dd:
                parsed = parse_date_french(dd.get_text(strip=True))
                if parsed:
                    return parsed

    # Pattern C: any text matching a date next to "contrat"
    full_text = soup.get_text(" ", strip=True)
    m = re.search(
        r"contrat jusqu[^\d]*(\d{1,2}\.?\s+\w+\s+\d{4}|\d{1,2}[./]\d{1,2}[./]\d{4})",
        full_text,
        re.IGNORECASE,
    )
    if m:
        parsed = parse_date_french(m.group(1))
        if parsed:
            return parsed

    return None

# ── Shortlist helpers ─────────────────────────────────────────────────────────

def fetch_shortlisted_users(player_ids: list[str]) -> dict[str, list[str]]:
    """
    Returns {player_id: [user_id, ...]} for all shortlist entries.
    Only includes players in `player_ids`.
    """
    if not player_ids:
        return {}
    ids_csv = ",".join(player_ids)
    rows = sb_get("shortlists", {
        "select": "user_id,player_id",
        "player_id": f"in.({ids_csv})",
    })
    mapping: dict[str, list[str]] = {}
    for row in rows:
        pid = row["player_id"]
        uid = row["user_id"]
        mapping.setdefault(pid, []).append(uid)
    return mapping

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info(
        "=== scrape_market_values.py %s%s===",
        "[DRY RUN] " if DRY_RUN else "",
        "[NO CONTRACTS] " if SKIP_CONTRACTS else "",
    )

    # Fetch all players with transfer-detection fields
    players = sb_get("players", {
        "select": "id,name,team,market_value_eur,contract_end",
        "order":  "name.asc",
    })
    log.info("Loaded %d players from Supabase", len(players))

    all_player_ids = [p["id"] for p in players]
    shortlist_map  = fetch_shortlisted_users(all_player_ids)
    log.info("Shortlist map loaded (%d shortlisted players)", len(shortlist_map))

    updated = not_found = transfers = contracts_flagged = 0
    pending_notifications: list[dict] = []

    for i, player in enumerate(players):
        pid            = player["id"]
        name           = player["name"]
        db_team        = player.get("team") or ""
        db_contract    = player.get("contract_end")

        log.info("[%d/%d] %s", i + 1, len(players), name)

        # ── 1. Transfermarkt search ───────────────────────────────────────
        data = fetch_player_data(name)
        value        = data["value"]
        tm_club      = data["club"]
        profile_path = data["profile_path"]

        if value is None:
            log.warning("  -> Not found on Transfermarkt")
            not_found += 1
        else:
            log.info(
                "  -> Value: %s EUR | Club: %s | Profile: %s",
                f"{value:,}",
                tm_club or "?",
                profile_path or "—",
            )

        # ── 2. Contract end from profile page ─────────────────────────────
        contract_end: date | None = None
        if not SKIP_CONTRACTS and profile_path:
            contract_end = fetch_contract_end(profile_path)
            if contract_end:
                log.info("  -> Contract end: %s", contract_end.isoformat())
            else:
                log.debug("  -> Contract end: not found")

        # ── 3. Transfer detection ─────────────────────────────────────────
        # A transfer is detected when TM reports a club different from DB
        transfer_detected = (
            tm_club
            and db_team
            and tm_club.strip().lower() != db_team.strip().lower()
        )

        if transfer_detected:
            log.info(
                "  TRANSFER detected: %r -> %r",
                db_team, tm_club,
            )
            transfers += 1

            # Notify users who shortlisted this player
            for uid in shortlist_map.get(pid, []):
                pending_notifications.append({
                    "user_id":   uid,
                    "type":      "transfer",
                    "title":     f"Transfert — {name}",
                    "message":   f"{name} a quitte {db_team} pour rejoindre {tm_club}.",
                    "player_id": pid,
                })

        # ── 4. Contract expiry detection ──────────────────────────────────
        # Flag if contract_end is within the next CONTRACT_WARN_DAYS days
        # Only create a new notification if we didn't already have one stored
        new_contract: date | None = contract_end or (
            date.fromisoformat(db_contract) if db_contract else None
        )

        if new_contract:
            days_left = (new_contract - TODAY).days
            if 0 < days_left <= CONTRACT_WARN_DAYS:
                # Only notify if this is freshly scraped (not already known)
                is_new_info = contract_end is not None and contract_end.isoformat() != (db_contract or "")
                if is_new_info or (contract_end and not db_contract):
                    log.info(
                        "  CONTRACT EXPIRING: %s in %d days",
                        new_contract.isoformat(), days_left,
                    )
                    contracts_flagged += 1

                    month_year = new_contract.strftime("%B %Y")
                    for uid in shortlist_map.get(pid, []):
                        pending_notifications.append({
                            "user_id":   uid,
                            "type":      "contract_expiring",
                            "title":     f"Contrat — {name}",
                            "message":   f"Contrat de {name} expire en {month_year}.",
                            "player_id": pid,
                        })

        # ── 5. Write to Supabase ──────────────────────────────────────────
        if not DRY_RUN:
            patch_data: dict = {}

            if value is not None:
                patch_data["market_value_eur"] = value

            if transfer_detected:
                patch_data["previous_club"] = db_team
                patch_data["team"]          = tm_club

            if contract_end is not None:
                patch_data["contract_end"] = contract_end.isoformat()

            if patch_data:
                sb_patch("players", patch_data, {"id": f"eq.{pid}"})

            if value is not None:
                sb_post("market_value_history", {
                    "player_id":   pid,
                    "value_eur":   value,
                    "source":      "transfermarkt",
                    "recorded_at": TODAY.isoformat(),
                })

        updated += 1 if value is not None else 0

        if i < len(players) - 1:
            time.sleep(SLEEP_SEC)

    # ── 6. Bulk-insert notifications ──────────────────────────────────────────
    if pending_notifications:
        log.info(
            "Inserting %d notification(s) (%d transfers, %d contract expiries)...",
            len(pending_notifications), transfers, contracts_flagged,
        )
        if not DRY_RUN:
            # Insert in batches of 50
            BATCH = 50
            for i in range(0, len(pending_notifications), BATCH):
                sb_post("notifications", pending_notifications[i : i + BATCH])
        else:
            for n in pending_notifications:
                log.info("  [DRY] would notify user %s: %s", n["user_id"][:8], n["message"])

    log.info(
        "Done. Updated: %d | Transfers: %d | Contracts: %d | Not found: %d | Total: %d",
        updated, transfers, contracts_flagged, not_found, len(players),
    )
    if DRY_RUN:
        log.info("DRY RUN — no writes made.")


if __name__ == "__main__":
    main()
