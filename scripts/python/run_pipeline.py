"""
run_pipeline.py — VIZION data pipeline orchestrator

Usage:
  python run_pipeline.py --all                  # scrape all 5 leagues + import
  python run_pipeline.py --league "Ligue 1"     # one league only
  python run_pipeline.py --dry-run              # scrape + transform, no DB write
  python run_pipeline.py --all --dry-run        # full run, no DB write
  python run_pipeline.py --season 2022-23 --all # historical season
"""

import argparse
import logging
import os
import sys
import time

import pandas as pd

# ─── Logging setup ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── Local imports ───────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from scraper import FBrefScraper, ALL_LEAGUES
from transform import DataTransformer
from import_supabase import import_players, print_summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="VIZION FBref → Supabase pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_pipeline.py --all
  python run_pipeline.py --league "Ligue 1"
  python run_pipeline.py --all --dry-run
  python run_pipeline.py --season 2022-23 --league "Bundesliga"
        """,
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--all", action="store_true",
        help="Scrape all 5 leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1)",
    )
    group.add_argument(
        "--league", type=str, metavar="LEAGUE",
        help=f'Scrape a single league. Options: {", ".join(ALL_LEAGUES)}',
    )

    parser.add_argument(
        "--dry-run", action="store_true",
        help="Scrape and transform, but do NOT write to Supabase",
    )
    parser.add_argument(
        "--season", type=str, default="2023-24",
        help="Season to scrape, e.g. 2023-24 (default: 2023-24)",
    )
    parser.add_argument(
        "--max-per-league", type=int, default=30,
        help="Max players to keep per league (default: 30)",
    )
    parser.add_argument(
        "--output-csv", type=str, default=None,
        help="Optional path to save the transformed data as CSV before importing",
    )

    return parser.parse_args()


def run(args: argparse.Namespace) -> None:
    start = time.time()

    leagues = ALL_LEAGUES if args.all else [args.league]

    _print_header(leagues, args)

    # ── Step 1: Scrape ───────────────────────────────────────────────────────
    log.info("=" * 50)
    log.info(f"STEP 1/3 — Scraping FBref ({args.season})")
    log.info("=" * 50)

    scraper = FBrefScraper(season=args.season, max_players_per_league=args.max_per_league)

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

    log.info(f"  → {len(raw_df)} raw players collected across {len(leagues)} league(s)")

    # ── Step 2: Transform ────────────────────────────────────────────────────
    log.info("=" * 50)
    log.info("STEP 2/3 — Cleaning and scoring")
    log.info("=" * 50)

    try:
        transformer = DataTransformer()
        df = transformer.transform(raw_df)
    except Exception as e:
        log.error(f"Transformation failed: {e}")
        sys.exit(1)

    log.info(f"  → {len(df)} players ready to import")

    # Preview top 10
    preview_cols = ["name", "team", "primary_position", "competition", "scout_score", "scout_label"]
    available_cols = [c for c in preview_cols if c in df.columns]
    print("\nTop 10 players by scout_score:")
    print(df[available_cols].head(10).to_string(index=False))
    print()

    # Optional CSV export
    if args.output_csv:
        df.to_csv(args.output_csv, index=False)
        log.info(f"  → Saved to {args.output_csv}")

    # ── Step 3: Import ───────────────────────────────────────────────────────
    log.info("=" * 50)
    log.info("STEP 3/3 — Importing to Supabase")
    log.info("=" * 50)

    if args.dry_run:
        log.info("  DRY-RUN mode — no data will be written to Supabase")

    try:
        result = import_players(df, dry_run=args.dry_run)
    except Exception as e:
        log.error(f"Import failed: {e}")
        sys.exit(1)

    if args.dry_run:
        result["dry_run_only"] = True

    # ── Summary ──────────────────────────────────────────────────────────────
    elapsed = time.time() - start
    print_summary(df, result)
    log.info(f"Pipeline complete in {elapsed:.1f}s")


def _print_header(leagues: list[str], args: argparse.Namespace) -> None:
    print()
    print("╔══════════════════════════════════════════╗")
    print("║  VIZION — FBref → Supabase Pipeline      ║")
    print("╚══════════════════════════════════════════╝")
    print(f"  Leagues  : {', '.join(leagues)}")
    print(f"  Season   : {args.season}")
    print(f"  Max/league: {args.max_per_league}")
    print(f"  Dry-run  : {'YES (no DB write)' if args.dry_run else 'NO'}")
    print()


if __name__ == "__main__":
    run(parse_args())
