# VIZION — FBref Scraping Pipeline

Scrapes player statistics from FBref and imports them into your Supabase `players` table.

## Prerequisites

- Python 3.10+
- `.env` at the project root with your Supabase credentials
- The `players` table must exist in Supabase (run `supabase/players-columns-migration.sql` first)

## Setup

```bash
# 1. Navigate to the Python scripts directory
cd scripts/python

# 2. Create a virtual environment
python -m venv venv

# 3. Activate it
# macOS / Linux:
source venv/bin/activate
# Windows (PowerShell):
venv\Scripts\Activate.ps1
# Windows (CMD):
venv\Scripts\activate.bat

# 4. Install dependencies
pip install -r requirements.txt
```

## Environment variables

The pipeline reads from `.env` at the project root. The following keys are required:

| Variable | Used for |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Write access (bypasses RLS) |

> **Security**: `VITE_SUPABASE_SERVICE_ROLE_KEY` is safe here because this script
> runs locally on your machine, never in the browser. Do NOT add it to your frontend code.

## Usage

```bash
# Test without writing to the database (recommended first run)
python run_pipeline.py --all --dry-run

# Import all 5 leagues
python run_pipeline.py --all

# Import a single league
python run_pipeline.py --league "Ligue 1"
python run_pipeline.py --league "Premier League"
python run_pipeline.py --league "La Liga"
python run_pipeline.py --league "Bundesliga"
python run_pipeline.py --league "Serie A"

# Historical season
python run_pipeline.py --all --season 2022-23

# Save transformed data as CSV (for inspection before import)
python run_pipeline.py --all --dry-run --output-csv /tmp/players.csv

# Limit to top 20 players per league
python run_pipeline.py --all --max-per-league 20
```

## What it does

```
FBref (soccerdata) ──► scraper.py
                           │
                    5 stat tables merged
                    (standard, shooting, passing, defense, possession)
                           │
                       transform.py
                           │
                    ┌──────┴───────────────┐
                    │  Scoring by position │
                    │  Labels (ELITE…)     │
                    │  Radar chart JSON    │
                    └──────────────────────┘
                           │
                    import_supabase.py
                           │
                    Upsert in batches of 25
                    (INSERT new, UPDATE existing)
                           │
                       Supabase ✅
```

## Scraping strategy (fallbacks)

1. **soccerdata** — Official FBref wrapper (primary)
2. **pandas.read_html** — Direct HTML parsing if soccerdata is blocked
3. **StatsBomb open data** — Match event aggregation as last resort (Premier League, La Liga, Ligue 1 only)

FBref enforces rate limiting. The pipeline sleeps **3 seconds between requests** automatically.
If you get 429 errors, increase `SLEEP_BETWEEN_REQUESTS` in `scraper.py`.

## Scoring formula

| Position | Formula |
|---|---|
| Attacker (ST/LW/RW) | `xG×0.25 + Goals×0.20 + xA×0.15 + Assists×0.15 + SCA×0.10 + Minutes×0.15` |
| Midfielder (CM/CAM/CDM) | `KeyPasses×0.20 + Pass%×0.20 + xA×0.15 + Pressures×0.15 + ProgPasses×0.15 + Tackles×0.15` |
| Defender (CB/LB/RB) | `Tackles×0.25 + Interceptions×0.20 + Clearances×0.20 + Blocks×0.15 + Pass%×0.20` |
| Goalkeeper | Default: 65 (insufficient GK stats in free FBref tier) |

All scores are normalised **0–100 within each position group**.

## Label thresholds

| Score | Label |
|---|---|
| 90–100 | ELITE |
| 75–89 | TOP PROSPECT |
| 60–74 | INTERESTING |
| 45–59 | TO MONITOR |
| 0–44 | LOW PRIORITY |

## Before running: apply the DB migration

The pipeline writes extra columns (xg, xa, tackles, individual_stats, etc.) that aren't
in the base `players` table. Run this first in Supabase → SQL Editor:

```
supabase/players-columns-migration.sql
```

## Troubleshooting

| Error | Fix |
|---|---|
| `soccerdata not found` | `pip install soccerdata` |
| `relation "players" does not exist` | Run the migration SQL in Supabase |
| `JWT expired` | Regenerate keys in Supabase dashboard |
| `503 / too many requests` | Increase `SLEEP_BETWEEN_REQUESTS` in scraper.py |
| Empty DataFrame | FBref structure changed — open an issue |
