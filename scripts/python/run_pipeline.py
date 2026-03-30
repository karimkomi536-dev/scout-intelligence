"""
run_pipeline.py — VIZION data pipeline orchestrator

Usage:
  python run_pipeline.py --all                          # Big 5 leagues, current season
  python run_pipeline.py --preset big5-2425            # 7 leagues, season 2024-25, 80/league
  python run_pipeline.py --league "Ligue 1"            # one league only
  python run_pipeline.py --dry-run --all               # full run, no DB write
  python run_pipeline.py --season 2023-24 --all        # historical season
  python run_pipeline.py --preset big5-2425 --dry-run  # preview 500+ player run
"""

import argparse
import logging
import os
import sys
import time

import pandas as pd

# ─── Logging setup ───────────────────────────────────────────────────────────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── Local imports ───────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from scraper import FBrefScraper, BIG5_LEAGUES, EXTENDED_LEAGUES, ALL_LEAGUES, LEAGUES
from transform import DataTransformer
from import_supabase import import_players, print_summary, snapshot_players

# ─── Presets ─────────────────────────────────────────────────────────────────

PRESETS: dict[str, dict] = {
    "big5-2425": {
        "leagues":      EXTENDED_LEAGUES,   # Big 5 + Ligue 2 + Championship
        "season":       "2024-25",
        "max_per_league": 80,
        "min_minutes":  500,
        "description":  "7 leagues, 2024-25 season, 80 players/league, min 500 min",
    },
    "big5-current": {
        "leagues":      BIG5_LEAGUES,
        "season":       "2024-25",
        "max_per_league": 30,
        "min_minutes":  200,
        "description":  "Big 5 only, current season, 30 players/league",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="VIZION FBref -> Supabase pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_pipeline.py --all
  python run_pipeline.py --preset big5-2425
  python run_pipeline.py --league "Ligue 1"
  python run_pipeline.py --all --dry-run
  python run_pipeline.py --season 2023-24 --league "Bundesliga"
  python run_pipeline.py --preset big5-2425 --dry-run
        """,
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--all", action="store_true",
        help="Scrape all Big 5 leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1)",
    )
    group.add_argument(
        "--league", type=str, metavar="LEAGUE",
        help=f'Scrape a single league. Options: {", ".join(LEAGUES.keys())}',
    )
    group.add_argument(
        "--preset", type=str, choices=list(PRESETS.keys()),
        help=(
            "Use a named preset. "
            + " | ".join(f"{k}: {v['description']}" for k, v in PRESETS.items())
        ),
    )

    parser.add_argument(
        "--dry-run", action="store_true",
        help="Scrape and transform, but do NOT write to Supabase",
    )
    parser.add_argument(
        "--season", type=str, default=None,
        help="Season to scrape, e.g. 2024-25 (overrides preset default)",
    )
    parser.add_argument(
        "--max-per-league", type=int, default=None,
        help="Max players to keep per league (overrides preset default)",
    )
    parser.add_argument(
        "--min-minutes", type=int, default=None,
        help="Minimum minutes played filter (overrides preset default)",
    )
    parser.add_argument(
        "--output-csv", type=str, default=None,
        help="Optional path to save the transformed data as CSV before importing",
    )

    return parser.parse_args()


def run(args: argparse.Namespace) -> None:
    start = time.time()

    # ── Resolve leagues + params from preset or explicit flags ───────────────
    if args.preset:
        preset     = PRESETS[args.preset]
        leagues    = preset["leagues"]
        season     = args.season       or preset["season"]
        max_league = args.max_per_league or preset["max_per_league"]
        min_min    = args.min_minutes   or preset["min_minutes"]
    elif args.all:
        leagues    = BIG5_LEAGUES
        season     = args.season        or "2024-25"
        max_league = args.max_per_league or 30
        min_min    = args.min_minutes    or 200
    else:
        leagues    = [args.league]
        season     = args.season        or "2024-25"
        max_league = args.max_per_league or 80
        min_min    = args.min_minutes    or 500

    _print_header(leagues, season, max_league, min_min, args.dry_run)

    # ── Step 1: Scrape ───────────────────────────────────────────────────────
    log.info("=" * 52)
    log.info(f"STEP 1/3 -- Scraping FBref ({season})")
    log.info("=" * 52)

    scraper = FBrefScraper(
        season=season,
        max_players_per_league=max_league,
        min_minutes=min_min,
    )

    try:
        raw_df = scraper.scrape(leagues=leagues)
    except KeyboardInterrupt:
        log.warning("Scraping interrupted by user.")
        sys.exit(0)
    except Exception as e:
        log.error(f"Scraping failed: {e}")
        sys.exit(1)

    if raw_df.empty:
        log.error("No data scraped. Exiting.")
        sys.exit(1)

    log.info(f"  -> {len(raw_df)} raw players collected across {len(leagues)} league(s)")

    # ── Step 2: Transform ────────────────────────────────────────────────────
    log.info("=" * 52)
    log.info("STEP 2/3 -- Cleaning and scoring")
    log.info("=" * 52)

    try:
        transformer = DataTransformer()
        df = transformer.transform(raw_df)
    except Exception as e:
        log.error(f"Transformation failed: {e}")
        sys.exit(1)

    log.info(f"  -> {len(df)} players ready to import")

    # Preview top 10
    preview_cols = ["name", "team", "primary_position", "competition", "scout_score", "scout_label", "is_u23"]
    available_cols = [c for c in preview_cols if c in df.columns]
    print("\nTop 10 players by scout_score:")
    print(df[available_cols].head(10).to_string(index=False))
    print()

    if args.output_csv:
        df.to_csv(args.output_csv, index=False)
        log.info(f"  -> Saved to {args.output_csv}")

    # ── Step 3: Import ───────────────────────────────────────────────────────
    log.info("=" * 52)
    log.info("STEP 3/3 -- Importing to Supabase")
    log.info("=" * 52)

    if args.dry_run:
        log.info("  DRY-RUN mode -- no data will be written to Supabase")

    try:
        result = import_players(df, dry_run=args.dry_run)
    except Exception as e:
        log.error(f"Import failed: {e}")
        sys.exit(1)

    if args.dry_run:
        result["dry_run_only"] = True

    # ── Step 4: Snapshot history ─────────────────────────────────────────────
    log.info("=" * 52)
    log.info("STEP 4/4 -- Saving history snapshots")
    log.info("=" * 52)

    snap = snapshot_players(df, season, dry_run=args.dry_run)
    if not args.dry_run:
        log.info(f"  -> {snap['snapshotted']} snapshots saved to player_history")

    # ── Summary ──────────────────────────────────────────────────────────────
    elapsed = time.time() - start
    print_summary(df, result)

    # One-line summary for quick reading
    ins = result["inserted"]
    upd = result["updated"]
    skp = result["skipped"]
    print(
        f"  -> {ins} inseres, {upd} mis a jour, {skp} ignores"
        f"  [{elapsed:.1f}s]"
    )
    print()


def _print_header(
    leagues: list[str],
    season: str,
    max_per_league: int,
    min_minutes: int,
    dry_run: bool,
) -> None:
    print()
    print("============================================")
    print("  VIZION -- FBref -> Supabase Pipeline")
    print("============================================")
    print(f"  Ligues     : {', '.join(leagues)}")
    print(f"  Saison     : {season}")
    print(f"  Max/ligue  : {max_per_league}")
    print(f"  Min minutes: {min_minutes}")
    print(f"  Dry-run    : {'OUI (pas d ecriture DB)' if dry_run else 'NON'}")
    print(f"  Total max  : {max_per_league * len(leagues)} joueurs")
    print()


if __name__ == "__main__":
    run(parse_args())
