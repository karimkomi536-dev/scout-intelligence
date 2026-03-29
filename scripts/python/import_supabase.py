"""
import_supabase.py — Upsert transformed player data into Supabase

Uses SUPABASE_SERVICE_ROLE_KEY (not anon key) to bypass RLS on the players table.

Upsert strategy:
  - Match on (name, team) — update if exists, insert if not.
  - Track score progression for updated players.
  - Batch size: 25 rows per request to stay under Supabase payload limits.
"""

import json
import logging
import os
import sys
from collections import Counter
from typing import Optional

import pandas as pd
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Load .env from project root (2 levels up from scripts/python/)
_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(_env_path)

log = logging.getLogger(__name__)

BATCH_SIZE = 25

# Columns that exist in the Supabase `players` table.
# Note: xg_per90, goals_per90, assists_per90, is_u23 are computed in transform.py
# but not yet in the DB schema — add them after running the per90-migration.sql
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
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise EnvironmentError(
            "VITE_SUPABASE_URL not found in .env. "
            "Make sure .env exists at the project root."
        )
    if not key:
        raise EnvironmentError(
            "SUPABASE_SERVICE_ROLE_KEY not found in .env. "
            "The service role key is required to write to Supabase."
        )

    return create_client(url, key)


def _row_to_dict(row: pd.Series) -> dict:
    """Convert a DataFrame row to a clean dict suitable for Supabase insert."""
    out = {}
    for col in PLAYERS_TABLE_COLUMNS:
        if col not in row.index:
            continue
        val = row[col]

        if col == "individual_stats":
            out[col] = val if isinstance(val, str) else json.dumps({})
            continue

        if pd.isna(val):
            out[col] = None
        elif hasattr(val, "item"):   # numpy scalar
            out[col] = val.item()
        else:
            out[col] = val

    return out


def import_players(df: pd.DataFrame, dry_run: bool = False) -> dict:
    """
    Upsert all players in df to Supabase.

    Returns a summary dict:
      {
        "inserted": int,
        "updated": int,
        "skipped": int,     # rows with missing name/team
        "errors": int,
        "error_details": list[str],
        "score_progressions": list[dict],   # [{name, team, old_score, new_score, delta}]
      }
    """
    if df.empty:
        log.warning("Empty DataFrame passed to import_players — nothing to do.")
        return {
            "inserted": 0, "updated": 0, "skipped": 0,
            "errors": 0, "error_details": [], "score_progressions": [],
        }

    client = None
    if not dry_run:
        try:
            client = _get_supabase_client()
        except EnvironmentError as e:
            log.error(str(e))
            sys.exit(1)

    # Pre-load existing players: (name, team) → scout_score for progression tracking
    existing_scores: dict[tuple, Optional[float]] = {}
    if client:
        try:
            resp = client.table("players").select("name,team,scout_score").execute()
            for r in (resp.data or []):
                key = (r["name"], r.get("team", ""))
                existing_scores[key] = r.get("scout_score")
            log.info(f"Found {len(existing_scores)} existing players in Supabase")
        except Exception as e:
            log.warning(f"Could not pre-fetch existing players: {e}")

    rows = [_row_to_dict(df.iloc[i]) for i in range(len(df))]

    inserted, updated, skipped, errors = 0, 0, 0, 0
    error_details: list[str] = []
    score_progressions: list[dict] = []
    total_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE

    for batch_idx in range(total_batches):
        batch      = rows[batch_idx * BATCH_SIZE: (batch_idx + 1) * BATCH_SIZE]
        batch_num  = batch_idx + 1
        log.info(f"Batch {batch_num}/{total_batches} : {len(batch)} players...")

        for row in batch:
            name = row.get("name", "").strip()
            team = row.get("team", "").strip()

            if not name or name in ("Unknown", "Player", "Rk"):
                skipped += 1
                log.debug(f"  SKIP  (no valid name): {name!r}")
                continue

            key       = (name, team)
            new_score = row.get("scout_score")

            if dry_run:
                if key in existing_scores:
                    old = existing_scores[key]
                    delta = (new_score - old) if (old is not None and new_score is not None) else None
                    log.info(
                        f"  [DRY] UPDATE  {name} ({team})"
                        + (f"  score {old:.0f} -> {new_score:.0f} ({delta:+.0f})" if delta is not None else "")
                    )
                    updated += 1
                else:
                    log.info(f"  [DRY] INSERT  {name} ({team})  score={new_score}")
                    inserted += 1
                continue

            try:
                if key in existing_scores:
                    client.table("players").update(row).eq("name", name).eq("team", team).execute()
                    updated += 1

                    # Track score progression
                    old_score = existing_scores[key]
                    if old_score is not None and new_score is not None:
                        delta = float(new_score) - float(old_score)
                        if abs(delta) >= 1.0:   # only log meaningful changes
                            score_progressions.append({
                                "name":      name,
                                "team":      team,
                                "old_score": round(float(old_score), 1),
                                "new_score": round(float(new_score), 1),
                                "delta":     round(delta, 1),
                            })
                else:
                    client.table("players").insert(row).execute()
                    existing_scores[key] = new_score
                    inserted += 1

            except Exception as e:
                errors += 1
                msg = f"{name} ({team}): {e}"
                error_details.append(msg)
                log.warning(f"  ERROR  {msg}")

    return {
        "inserted":          inserted,
        "updated":           updated,
        "skipped":           skipped,
        "errors":            errors,
        "error_details":     error_details,
        "score_progressions": score_progressions,
    }


def print_summary(df: pd.DataFrame, result: dict) -> None:
    """Print a human-readable import summary."""
    SEP = "=" * 52
    print()
    print(SEP)
    print("  VIZION -- Import Summary")
    print(SEP)

    if not result.get("dry_run_only"):
        print(f"  [NEW]     {result['inserted']:>4} joueurs inseres")
        print(f"  [UPDATE]  {result['updated']:>4} joueurs mis a jour")
        print(f"  [SKIP]    {result['skipped']:>4} ignores (nom manquant)")
        print(f"  [ERROR]   {result['errors']:>4} erreurs")
    else:
        print(f"  DRY-RUN — aucune ecriture Supabase")
        print(f"  -> {result['inserted']} nouveaux, {result['updated']} mises a jour")

    if result.get("error_details"):
        print("\nErreurs :")
        for msg in result["error_details"][:10]:
            print(f"  - {msg}")
        if len(result["error_details"]) > 10:
            print(f"  ... et {len(result['error_details']) - 10} de plus")

    # Score progressions
    progressions = result.get("score_progressions", [])
    if progressions:
        sorted_prog = sorted(progressions, key=lambda x: abs(x["delta"]), reverse=True)
        print(f"\nProgressions notables ({len(progressions)} joueurs):")
        for p in sorted_prog[:10]:
            arrow = "+" if p["delta"] >= 0 else ""
            print(
                f"  {p['name']:<28} ({p['team']:<20})  "
                f"{p['old_score']:.0f} -> {p['new_score']:.0f}  ({arrow}{p['delta']:.0f})"
            )

    # Label distribution
    if "scout_label" in df.columns:
        print("\nDistribution labels :")
        counts = Counter(df["scout_label"])
        for label in ["ELITE", "TOP PROSPECT", "INTERESTING", "TO MONITOR", "LOW PRIORITY"]:
            n = counts.get(label, 0)
            bar = "#" * (n // 4)
            print(f"  {label:<15} {n:>4}  {bar}")

    # League distribution
    if "competition" in df.columns:
        print("\nPar ligue :")
        for league, count in df["competition"].value_counts().items():
            print(f"  {league:<22} {count} joueurs")

    # U23 summary
    if "is_u23" in df.columns:
        n_u23 = int(df["is_u23"].sum())
        print(f"\nJoueurs U23 (age <= 23) : {n_u23} / {len(df)}")

    print(SEP + "\n")
