"""
import_supabase.py — Upsert transformed player data into Supabase

Uses SUPABASE_SERVICE_ROLE_KEY (not anon key) to bypass RLS on the players table.
Falls back to VITE_SUPABASE_SERVICE_ROLE_KEY if the unprefixed version is absent.

Upsert strategy: match on (name, team) — update if exists, insert if not.
Batch size: 25 rows per request to stay under Supabase payload limits.
"""

import json
import logging
import os
import sys
from collections import Counter
from typing import Optional

import pandas as pd
from dotenv import load_dotenv

# Load .env from project root (2 levels up from scripts/python/)
_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(_env_path)

log = logging.getLogger(__name__)

BATCH_SIZE = 25

# Columns that exist in the Supabase `players` table.
# Add new ones here after running supabase/players-columns-migration.sql
PLAYERS_TABLE_COLUMNS = [
    "name", "age", "team", "primary_position", "competition",
    "nationality", "foot", "scout_score", "scout_label",
    "minutes_played", "appearances", "goals", "assists",
    "xg", "xa", "shot_creating_actions",
    "tackles", "interceptions", "blocks", "clearances",
    "pressures", "pressure_success_rate",
    "pass_completion_rate", "progressive_passes", "key_passes",
    "individual_stats",
]


def _get_supabase_client():
    """Create and return a Supabase client using the service role key."""
    from supabase import create_client

    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")
    )

    if not url:
        raise EnvironmentError(
            "VITE_SUPABASE_URL not found in .env. "
            "Make sure .env exists at the project root."
        )
    if not key:
        raise EnvironmentError(
            "Neither SUPABASE_SERVICE_ROLE_KEY nor VITE_SUPABASE_SERVICE_ROLE_KEY "
            "found in .env. The service role key is required to write to Supabase."
        )

    return create_client(url, key)


def _row_to_dict(row: pd.Series) -> dict:
    """Convert a DataFrame row to a clean dict suitable for Supabase insert."""
    out = {}
    for col in PLAYERS_TABLE_COLUMNS:
        if col not in row.index:
            continue
        val = row[col]

        # individual_stats is already a JSON string from transform.py
        if col == "individual_stats":
            out[col] = val if isinstance(val, str) else json.dumps({})
            continue

        # Convert numpy types → Python natives
        if pd.isna(val):
            out[col] = None
        elif hasattr(val, "item"):  # numpy scalar
            out[col] = val.item()
        else:
            out[col] = val

    return out


def import_players(df: pd.DataFrame, dry_run: bool = False) -> dict:
    """
    Upsert all players in df to Supabase.

    Returns a summary dict:
      {"inserted": int, "updated": int, "errors": int, "error_details": list}
    """
    if df.empty:
        log.warning("Empty DataFrame passed to import_players — nothing to do.")
        return {"inserted": 0, "updated": 0, "errors": 0, "error_details": []}

    client = None
    if not dry_run:
        try:
            client = _get_supabase_client()
        except EnvironmentError as e:
            log.error(str(e))
            sys.exit(1)

    # Pre-load existing players keyed by (name, team) for diff detection
    existing: set[tuple] = set()
    if client:
        try:
            resp = client.table("players").select("name,team").execute()
            existing = {(r["name"], r.get("team", "")) for r in (resp.data or [])}
            log.info(f"Found {len(existing)} existing players in Supabase")
        except Exception as e:
            log.warning(f"Could not pre-fetch existing players: {e}")

    rows = [_row_to_dict(df.iloc[i]) for i in range(len(df))]

    inserted, updated, errors = 0, 0, 0
    error_details: list[str] = []
    total_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE

    for batch_idx in range(total_batches):
        batch = rows[batch_idx * BATCH_SIZE: (batch_idx + 1) * BATCH_SIZE]
        batch_num = batch_idx + 1
        log.info(f"Batch {batch_num}/{total_batches} : {len(batch)} players…")

        if dry_run:
            for row in batch:
                key = (row.get("name", ""), row.get("team", ""))
                if key in existing:
                    log.info(f"  [DRY-RUN] WOULD UPDATE: {row['name']} ({row['team']})")
                    updated += 1
                else:
                    log.info(f"  [DRY-RUN] WOULD INSERT: {row['name']} ({row['team']})")
                    inserted += 1
            continue

        # Process each row individually for granular error handling
        for row in batch:
            name = row.get("name", "?")
            team = row.get("team", "?")
            key  = (name, team)
            try:
                if key in existing:
                    # UPDATE: match on name + team
                    client.table("players").update(row).eq("name", name).eq("team", team).execute()
                    updated += 1
                else:
                    client.table("players").insert(row).execute()
                    existing.add(key)
                    inserted += 1
            except Exception as e:
                errors += 1
                msg = f"{name} ({team}): {e}"
                error_details.append(msg)
                log.warning(f"  ❌ {msg}")

    return {
        "inserted":     inserted,
        "updated":      updated,
        "errors":       errors,
        "error_details": error_details,
    }


def print_summary(df: pd.DataFrame, result: dict) -> None:
    """Print a human-readable import summary."""
    print("\n" + "═" * 50)
    print("VIZION — Import Summary")
    print("═" * 50)

    if not result.get("dry_run_only"):
        print(f"✅  {result['inserted']} players inserted")
        print(f"🔄  {result['updated']} players updated")
        print(f"❌  {result['errors']} errors")

    if result["error_details"]:
        print("\nError details:")
        for msg in result["error_details"][:10]:
            print(f"  • {msg}")
        if len(result["error_details"]) > 10:
            print(f"  … and {len(result['error_details']) - 10} more")

    # Label distribution
    if "scout_label" in df.columns:
        print("\n📊 Label distribution:")
        counts = Counter(df["scout_label"])
        for label in ["ELITE", "TOP PROSPECT", "INTERESTING", "TO MONITOR", "LOW PRIORITY"]:
            n = counts.get(label, 0)
            bar = "█" * (n // 2)
            print(f"  {label:<15} {n:>4}  {bar}")

    # League distribution
    if "competition" in df.columns:
        print("\n🏆 By league:")
        for league, count in df["competition"].value_counts().items():
            print(f"  {league:<20} {count} players")

    print("═" * 50 + "\n")
