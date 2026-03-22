"""
scraper.py — FBref player data scraper for VIZION

Strategy:
  1. Primary  : soccerdata library (clean FBref wrapper)
  2. Fallback : pandas.read_html directly on FBref stat pages
  3. Last resort: StatsBomb open-data aggregation (match events → season totals)

Rate limiting: 3-second sleep between requests to avoid IP bans.
"""

import time
import logging
import warnings
from typing import Optional

import pandas as pd
import numpy as np
import requests

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SLEEP_BETWEEN_REQUESTS = 3  # seconds — FBref rate limit

# ─── League catalogue ────────────────────────────────────────────────────────
# Keys are the user-facing names used in --league CLI argument.
# Values: (soccerdata league id, FBref numeric id, FBref URL slug)
LEAGUES: dict[str, tuple[str, int, str]] = {
    "Premier League": ("ENG-Premier League",  9,  "Premier-League"),
    "La Liga":        ("ESP-La Liga",         12,  "La-Liga"),
    "Bundesliga":     ("GER-Bundesliga",      20,  "Bundesliga"),
    "Serie A":        ("ITA-Serie A",         11,  "Serie-A"),
    "Ligue 1":        ("FRA-Ligue 1",         13,  "Ligue-1"),
}

ALL_LEAGUES = list(LEAGUES.keys())

# FBref stat table types we want to merge
STAT_TYPES = ["standard", "shooting", "passing", "defense", "possession"]


class FBrefScraper:
    """
    Scrapes player season statistics from FBref.

    Usage:
        scraper = FBrefScraper(season="2023-24")
        df = scraper.scrape(leagues=["Ligue 1", "Premier League"])
    """

    def __init__(self, season: str = "2023-24", max_players_per_league: int = 30):
        self.season = season
        self.max_players_per_league = max_players_per_league

    # ─── Public API ──────────────────────────────────────────────────────────

    def scrape(self, leagues: list[str]) -> pd.DataFrame:
        frames = []
        for league in leagues:
            if league not in LEAGUES:
                log.warning(f"Unknown league '{league}'. Available: {ALL_LEAGUES}")
                continue
            log.info(f"Scraping {league}…")
            df = self._scrape_league(league)
            if df is not None and not df.empty:
                df["competition"] = league
                frames.append(df)
                log.info(f"  → {len(df)} players collected from {league}")
            else:
                log.warning(f"  → No data collected for {league}")

        if not frames:
            log.error("No data collected from any league.")
            return pd.DataFrame()

        return pd.concat(frames, ignore_index=True)

    # ─── Strategy dispatch ───────────────────────────────────────────────────

    def _scrape_league(self, league_name: str) -> Optional[pd.DataFrame]:
        # Try soccerdata first
        try:
            df = self._scrape_soccerdata(league_name)
            if df is not None and not df.empty:
                return df
        except Exception as e:
            log.warning(f"soccerdata failed for {league_name}: {e}")

        # Fallback: direct pandas.read_html
        log.info(f"  Falling back to direct HTML scraping for {league_name}…")
        try:
            df = self._scrape_direct(league_name)
            if df is not None and not df.empty:
                return df
        except Exception as e:
            log.warning(f"Direct scraping failed for {league_name}: {e}")

        # Last resort: StatsBomb open data
        log.info(f"  Falling back to StatsBomb open data for {league_name}…")
        try:
            return self._scrape_statsbomb(league_name)
        except Exception as e:
            log.error(f"All strategies failed for {league_name}: {e}")
            return None

    # ─── Strategy 1: soccerdata ──────────────────────────────────────────────

    def _scrape_soccerdata(self, league_name: str) -> pd.DataFrame:
        import soccerdata as sd

        sd_id, _, _ = LEAGUES[league_name]
        fbref = sd.FBref(leagues=[sd_id], seasons=[self.season])

        frames = {}
        for stat_type in STAT_TYPES:
            try:
                log.debug(f"    Fetching {stat_type} stats via soccerdata…")
                df = fbref.read_player_season_stats(stat_type=stat_type)
                # soccerdata returns a MultiIndex — flatten it
                if isinstance(df.index, pd.MultiIndex):
                    df = df.reset_index()
                frames[stat_type] = df
                time.sleep(SLEEP_BETWEEN_REQUESTS)
            except Exception as e:
                log.debug(f"    {stat_type} stats unavailable: {e}")

        if "standard" not in frames:
            raise ValueError("Standard stats not available via soccerdata")

        return self._merge_soccerdata_frames(frames, league_name)

    def _merge_soccerdata_frames(self, frames: dict, league_name: str) -> pd.DataFrame:
        """Merge all stat-type DataFrames on player identity columns."""
        std = frames["standard"].copy()

        # Normalise column names (soccerdata versions differ slightly)
        std.columns = [str(c).strip().lower().replace(" ", "_") for c in std.columns]

        # Identify the player name column
        name_col = next((c for c in std.columns if c in ("player", "name")), None)
        team_col = next((c for c in std.columns if c in ("squad", "team", "club")), None)

        if not name_col:
            raise ValueError(f"Could not find player name column. Columns: {std.columns.tolist()}")

        key_cols = [c for c in [name_col, team_col] if c]
        result = std.copy()

        for stat_type, df in frames.items():
            if stat_type == "standard":
                continue
            df = df.copy()
            df.columns = [
                f"{stat_type}_{c}" if c not in key_cols else c
                for c in [str(x).strip().lower().replace(" ", "_") for x in df.columns]
            ]
            result = result.merge(df, on=key_cols, how="left", suffixes=("", f"_{stat_type}_dup"))

        # Drop duplicate columns from merges
        result = result.loc[:, ~result.columns.str.endswith("_dup")]

        return self._normalise_columns(result, name_col, team_col, league_name)

    # ─── Strategy 2: direct pandas.read_html ─────────────────────────────────

    def _scrape_direct(self, league_name: str) -> pd.DataFrame:
        """Scrape FBref standard stats directly using pandas.read_html."""
        _, fbref_id, fbref_slug = LEAGUES[league_name]

        stat_endpoints = {
            "standard":   f"https://fbref.com/en/comps/{fbref_id}/stats/players/{fbref_slug}-Stats",
            "shooting":   f"https://fbref.com/en/comps/{fbref_id}/shooting/players/{fbref_slug}-Stats",
            "passing":    f"https://fbref.com/en/comps/{fbref_id}/passing/players/{fbref_slug}-Stats",
            "defense":    f"https://fbref.com/en/comps/{fbref_id}/defense/players/{fbref_slug}-Stats",
            "possession": f"https://fbref.com/en/comps/{fbref_id}/possession/players/{fbref_slug}-Stats",
        }

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        }

        raw_frames: dict[str, pd.DataFrame] = {}
        for stat_type, url in stat_endpoints.items():
            try:
                log.debug(f"    GET {url}")
                resp = requests.get(url, headers=headers, timeout=30)
                resp.raise_for_status()

                # FBref has two header rows — use header=[0,1] then flatten
                tables = pd.read_html(resp.text, header=[0, 1])
                if not tables:
                    continue
                df = tables[0].copy()
                # Flatten multi-level columns
                df.columns = [
                    "_".join(str(s).strip() for s in col if "Unnamed" not in str(s)).strip("_").lower()
                    for col in df.columns
                ]
                # Drop aggregate/header rows FBref injects mid-table
                df = df[df.get("rk", df.columns[0]) != "Rk"].copy()
                raw_frames[stat_type] = df
                time.sleep(SLEEP_BETWEEN_REQUESTS)
            except Exception as e:
                log.debug(f"    {stat_type} direct scrape failed: {e}")

        if "standard" not in raw_frames:
            raise ValueError("Could not scrape standard stats directly")

        return self._merge_direct_frames(raw_frames, league_name)

    def _merge_direct_frames(self, frames: dict, league_name: str) -> pd.DataFrame:
        """Merge DataFrames from direct HTML scraping."""
        std = frames["standard"].copy()

        # Try to find player/squad columns despite flattened name weirdness
        name_col = next(
            (c for c in std.columns if any(k in c for k in ["player", "name"]) and "unnamed" not in c),
            None,
        )
        team_col = next(
            (c for c in std.columns if any(k in c for k in ["squad", "team", "club"]) and "unnamed" not in c),
            None,
        )

        if not name_col:
            raise ValueError(f"No name column found. Columns: {std.columns.tolist()[:20]}")

        key_cols = [c for c in [name_col, team_col] if c]
        result = std.copy()

        for stat_type, df in frames.items():
            if stat_type == "standard":
                continue
            try:
                df = df.copy()
                overlap = [c for c in df.columns if c in key_cols]
                if not overlap:
                    continue
                result = result.merge(df, on=overlap, how="left", suffixes=("", f"_{stat_type}"))
            except Exception as e:
                log.debug(f"    Merge failed for {stat_type}: {e}")

        return self._normalise_columns(result, name_col, team_col, league_name)

    # ─── Strategy 3: StatsBomb open data ─────────────────────────────────────

    def _scrape_statsbomb(self, league_name: str) -> pd.DataFrame:
        """
        Pull StatsBomb open-data match events and aggregate to player season totals.
        Covers only competitions available in StatsBomb's free dataset.
        https://github.com/statsbomb/open-data
        """
        BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"

        # Map our league names to StatsBomb competition IDs
        SB_COMPETITIONS = {
            "Premier League": (2,   27),   # (competition_id, season_id) — 2003-04
            "La Liga":        (11,  27),
            "Ligue 1":        (7,   27),
        }

        if league_name not in SB_COMPETITIONS:
            log.warning(f"StatsBomb open data not available for {league_name}")
            return pd.DataFrame()

        comp_id, season_id = SB_COMPETITIONS[league_name]

        try:
            matches_url = f"{BASE}/matches/{comp_id}/{season_id}.json"
            matches = requests.get(matches_url, timeout=30).json()
        except Exception as e:
            raise ValueError(f"Could not fetch StatsBomb matches: {e}")

        log.info(f"  StatsBomb: {len(matches)} matches found for {league_name}")

        # Aggregate goals + assists per player across all matches
        player_stats: dict[str, dict] = {}

        for i, match in enumerate(matches[:20]):  # limit to 20 matches for speed
            try:
                events_url = f"{BASE}/events/{match['match_id']}.json"
                events = requests.get(events_url, timeout=30).json()

                for event in events:
                    pname = event.get("player", {}).get("name", "Unknown")
                    team  = event.get("team", {}).get("name", "Unknown")
                    pos   = event.get("position", {}).get("name", "")

                    if pname not in player_stats:
                        player_stats[pname] = {
                            "name": pname, "team": team, "position": pos,
                            "goals": 0, "assists": 0, "shots": 0,
                            "passes": 0, "pass_attempts": 0,
                            "tackles": 0, "interceptions": 0,
                            "minutes_played": 0, "appearances": 0,
                        }

                    etype = event.get("type", {}).get("name", "")
                    if etype == "Shot":
                        player_stats[pname]["shots"] += 1
                        outcome = event.get("shot", {}).get("outcome", {}).get("name", "")
                        if outcome == "Goal":
                            player_stats[pname]["goals"] += 1
                    elif etype == "Pass":
                        player_stats[pname]["passes"] += 1
                        player_stats[pname]["pass_attempts"] += 1
                    elif etype == "Duel":
                        player_stats[pname]["tackles"] += 1

                time.sleep(0.5)
            except Exception:
                continue

        if not player_stats:
            return pd.DataFrame()

        df = pd.DataFrame(list(player_stats.values()))
        df["competition"] = league_name
        df["age"] = 25  # unknown in StatsBomb events
        df["nationality"] = "Unknown"
        df["foot"] = "Unknown"
        df["xg"] = df["shots"] * 0.1  # rough estimate
        df["xa"] = df["assists"] * 0.85
        return df.head(self.max_players_per_league)

    # ─── Column normalisation ────────────────────────────────────────────────

    def _normalise_columns(
        self,
        df: pd.DataFrame,
        name_col: str,
        team_col: Optional[str],
        league_name: str,
    ) -> pd.DataFrame:
        """
        Map raw FBref column names → canonical VIZION column names.
        Returns a clean DataFrame with only the columns we care about.
        """
        # Build a lookup: raw column → canonical name
        # We search flexibly because column names vary across soccerdata versions
        def find(candidates: list[str]) -> Optional[str]:
            for cand in candidates:
                match = next((c for c in df.columns if cand in c), None)
                if match:
                    return match
            return None

        col_map = {
            "name":                   name_col,
            "team":                   team_col or find(["squad", "team", "club"]),
            "age":                    find(["_age", "_born"]),
            "nationality":            find(["nation", "nationality"]),
            "position":               find(["_pos", "position"]),
            "foot":                   find(["_foot", "preferred_foot"]),
            "minutes_played":         find(["_min", "minutes"]),
            "appearances":            find(["_mp", "matches_played", "starts"]),
            "goals":                  find(["_goals", "_gls"]),
            "assists":                find(["_ast", "_assists"]),
            "xg":                     find(["_xg", "expected_goals"]),
            "xa":                     find(["_xag", "_xa", "expected_assists"]),
            "shot_creating_actions":  find(["_sca", "shot_creating"]),
            "tackles":                find(["defense_tkl", "_tkl", "tackles"]),
            "interceptions":          find(["_int", "interceptions"]),
            "blocks":                 find(["_blocks", "defense_blocks"]),
            "clearances":             find(["_clr", "clearances"]),
            "pressures":              find(["_press", "pressures"]),
            "pressure_success_rate":  find(["_succ%", "pressure_succ"]),
            "pass_completion_rate":   find(["_cmp%", "pass_cmp%", "passing_cmp"]),
            "progressive_passes":     find(["_prgp", "progressive_passes", "passing_prgp"]),
            "key_passes":             find(["_kp", "key_passes"]),
        }

        # Build output with canonical names
        out = {}
        for canonical, raw in col_map.items():
            if raw and raw in df.columns:
                out[canonical] = df[raw]
            else:
                out[canonical] = np.nan

        result = pd.DataFrame(out)

        # Coerce numerics
        numeric_cols = [c for c in result.columns if c not in ("name", "team", "nationality", "position", "foot")]
        for c in numeric_cols:
            result[c] = pd.to_numeric(result[c], errors="coerce")

        # Drop rows with no player name
        result = result.dropna(subset=["name"])
        result["name"] = result["name"].astype(str).str.strip()

        # Remove FBref injected "header" rows
        result = result[~result["name"].isin(["Player", "Rk", ""])]

        # Sort by xg desc and cap to max_players_per_league
        result = result.sort_values("xg", ascending=False, na_position="last")
        result = result.head(self.max_players_per_league).reset_index(drop=True)

        return result
