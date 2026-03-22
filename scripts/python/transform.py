"""
transform.py — Data cleaning and scoring for VIZION

Steps:
  1. Clean nulls and normalise position names
  2. Compute overall_score (0-100) per position group, normalised within league+position
  3. Assign scout_label (ELITE / TOP PROSPECT / INTERESTING / TO MONITOR / LOW PRIORITY)
  4. Build individual_stats JSON for the radar chart (6 axes)
"""

import json
import logging
import warnings
from typing import Optional

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
log = logging.getLogger(__name__)

# ─── Position mapping ────────────────────────────────────────────────────────
# Maps FBref position strings → VIZION canonical positions

POSITION_MAP: dict[str, str] = {
    # Exact matches first
    "GK":     "GK",
    "DF":     "CB",
    "DF,MF":  "CDM",
    "MF,DF":  "CDM",
    "MF":     "CM",
    "MF,FW":  "CAM",
    "FW,MF":  "CAM",
    "FW":     "ST",
    "FW,DF":  "ST",
    # StatsBomb position names
    "Goalkeeper":        "GK",
    "Center Back":       "CB",
    "Left Back":         "LB",
    "Right Back":        "RB",
    "Left Wing Back":    "LB",
    "Right Wing Back":   "RB",
    "Defensive Midfield":"CDM",
    "Center Midfield":   "CM",
    "Left Midfield":     "CM",
    "Right Midfield":    "CM",
    "Attacking Midfield":"CAM",
    "Left Wing":         "LW",
    "Right Wing":        "RW",
    "Center Forward":    "ST",
    "Secondary Striker": "ST",
}

# Scoring weights by position category
# Values are (stat_column, weight) — weights sum to 1.0
SCORING_WEIGHTS: dict[str, list[tuple[str, float]]] = {
    "ATT": [  # ST, LW, RW
        ("xg",                   0.25),
        ("goals",                0.20),
        ("xa",                   0.15),
        ("assists",              0.15),
        ("shot_creating_actions",0.10),
        ("minutes_factor",       0.15),
    ],
    "MID": [  # CM, CAM, CDM
        ("key_passes",           0.20),
        ("pass_completion_rate", 0.20),
        ("xa",                   0.15),
        ("pressures",            0.15),
        ("progressive_passes",   0.15),
        ("tackles",              0.15),
    ],
    "DEF": [  # CB, LB, RB
        ("tackles",              0.25),
        ("interceptions",        0.20),
        ("clearances",           0.20),
        ("blocks",               0.15),
        ("pass_completion_rate", 0.20),
    ],
    "GK": [],  # Insufficient GK stats from FBref free tier → use default score
}

POSITION_CATEGORY: dict[str, str] = {
    "ST":  "ATT", "LW":  "ATT", "RW":  "ATT",
    "CM":  "MID", "CAM": "MID", "CDM": "MID",
    "CB":  "DEF", "LB":  "DEF", "RB":  "DEF",
    "GK":  "GK",
}

LABEL_THRESHOLDS = [
    (90, "ELITE"),
    (75, "TOP PROSPECT"),
    (60, "INTERESTING"),
    (45, "TO MONITOR"),
    (0,  "LOW PRIORITY"),
]


class DataTransformer:
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        log.info(f"Transforming {len(df)} players…")
        df = df.copy()

        df = self._clean_nulls(df)
        df = self._normalise_positions(df)
        df = self._add_minutes_factor(df)
        df = self._compute_scores(df)
        df = self._assign_labels(df)
        df = self._build_individual_stats(df)
        df = self._final_types(df)

        log.info(f"Transformation complete. Score range: {df['scout_score'].min():.0f} – {df['scout_score'].max():.0f}")
        return df

    # ─── Step 1: Clean nulls ─────────────────────────────────────────────────

    def _clean_nulls(self, df: pd.DataFrame) -> pd.DataFrame:
        numeric_cols = [
            "age", "minutes_played", "appearances", "goals", "assists",
            "xg", "xa", "shot_creating_actions", "tackles", "interceptions",
            "blocks", "clearances", "pressures", "pressure_success_rate",
            "pass_completion_rate", "progressive_passes", "key_passes",
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            else:
                df[col] = 0

        # Text columns
        for col in ("name", "team", "nationality", "foot", "competition"):
            if col not in df.columns:
                df[col] = "Unknown"
            df[col] = df[col].fillna("Unknown").astype(str).str.strip()

        if "age" not in df.columns:
            df["age"] = 25
        df["age"] = df["age"].clip(15, 45)

        return df

    # ─── Step 2: Normalise positions ─────────────────────────────────────────

    def _normalise_positions(self, df: pd.DataFrame) -> pd.DataFrame:
        def map_pos(raw: str) -> str:
            raw = str(raw).strip()
            # Direct lookup
            if raw in POSITION_MAP:
                return POSITION_MAP[raw]
            # Partial match
            raw_up = raw.upper()
            if "GK" in raw_up or "GOAL" in raw_up:
                return "GK"
            if "DF" in raw_up or "BACK" in raw_up or "CB" in raw_up:
                return "CB"
            if "FW" in raw_up or "FORWARD" in raw_up or "STRIK" in raw_up:
                return "ST"
            if "MF" in raw_up or "MID" in raw_up:
                return "CM"
            return "CM"  # default

        if "position" in df.columns:
            df["primary_position"] = df["position"].apply(map_pos)
        else:
            df["primary_position"] = "CM"

        return df

    # ─── Step 3: Minutes factor (0-1 penalises players with few minutes) ─────

    def _add_minutes_factor(self, df: pd.DataFrame) -> pd.DataFrame:
        max_min = df["minutes_played"].quantile(0.95) if df["minutes_played"].max() > 0 else 3000
        max_min = max(max_min, 1)
        df["minutes_factor"] = (df["minutes_played"] / max_min).clip(0, 1) * 100
        return df

    # ─── Step 4: Compute scores ───────────────────────────────────────────────

    def _compute_scores(self, df: pd.DataFrame) -> pd.DataFrame:
        df["raw_score"] = 0.0

        for pos_cat, weights in SCORING_WEIGHTS.items():
            if pos_cat == "GK":
                continue
            mask = df["primary_position"].map(POSITION_CATEGORY) == pos_cat
            if not mask.any():
                continue

            raw = pd.Series(0.0, index=df.index)
            for col, weight in weights:
                if col in df.columns:
                    raw[mask] += df.loc[mask, col] * weight

            # Normalise to 0-100 within this position group
            group_vals = raw[mask]
            vmin, vmax = group_vals.min(), group_vals.max()
            if vmax > vmin:
                normalised = (group_vals - vmin) / (vmax - vmin) * 100
            else:
                normalised = pd.Series(65.0, index=group_vals.index)

            df.loc[mask, "raw_score"] = normalised

        # GK default
        gk_mask = df["primary_position"] == "GK"
        df.loc[gk_mask, "raw_score"] = 65.0

        # Slight age adjustment: boost players under 23 by up to 5 points
        young_mask = df["age"] < 23
        youth_bonus = ((23 - df.loc[young_mask, "age"]) * 1.0).clip(0, 5)
        df.loc[young_mask, "raw_score"] = (df.loc[young_mask, "raw_score"] + youth_bonus).clip(0, 100)

        df["scout_score"] = df["raw_score"].round(1)
        return df

    # ─── Step 5: Labels ───────────────────────────────────────────────────────

    def _assign_labels(self, df: pd.DataFrame) -> pd.DataFrame:
        def get_label(score: float) -> str:
            for threshold, label in LABEL_THRESHOLDS:
                if score >= threshold:
                    return label
            return "LOW PRIORITY"

        df["scout_label"] = df["scout_score"].apply(get_label)
        return df

    # ─── Step 6: Individual stats JSON (radar chart) ──────────────────────────

    def _build_individual_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        6 axes (0-100 each):
          technique  — passing quality, key passes, progressive passes
          physical   — pressures, tackles, clearances (workload proxy)
          pace       — position + age heuristic (FBref has no speed data)
          mental     — shot creating actions, pressure success rate
          tactical   — interceptions, blocks, progressive passes
          potential  — young player bonus (age < 23), capped at 100
        """
        def _norm(series: pd.Series) -> pd.Series:
            vmin, vmax = series.min(), series.max()
            if vmax > vmin:
                return ((series - vmin) / (vmax - vmin) * 100).clip(0, 100)
            return pd.Series(50.0, index=series.index)

        # Technique
        tech = (
            _norm(df["pass_completion_rate"]) * 0.40 +
            _norm(df["key_passes"])           * 0.35 +
            _norm(df["progressive_passes"])   * 0.25
        )

        # Physical
        phys = (
            _norm(df["pressures"])   * 0.40 +
            _norm(df["tackles"])     * 0.35 +
            _norm(df["clearances"])  * 0.25
        )

        # Pace — positional base + slight age penalty
        PACE_BASE = {"ST": 80, "LW": 82, "RW": 82, "CAM": 72, "CM": 65,
                     "CDM": 62, "LB": 70, "RB": 70, "CB": 58, "GK": 45}
        pace_base = df["primary_position"].map(PACE_BASE).fillna(60).astype(float)
        pace = (pace_base - (df["age"] - 23).clip(0) * 1.5).clip(0, 100)

        # Mental
        mental = (
            _norm(df["shot_creating_actions"]) * 0.50 +
            _norm(df["pressure_success_rate"]) * 0.50
        )

        # Tactical
        tactical = (
            _norm(df["interceptions"])        * 0.40 +
            _norm(df["blocks"])               * 0.30 +
            _norm(df["progressive_passes"])   * 0.30
        )

        # Potential — only meaningful for players under 23
        potential = pd.Series(50.0, index=df.index)
        young = df["age"] < 23
        potential[young] = ((23 - df.loc[young, "age"]) * 1.2 + df.loc[young, "scout_score"]).clip(0, 100)
        potential[~young] = (df.loc[~young, "scout_score"] * 0.8).clip(0, 100)

        def to_json(row) -> str:
            return json.dumps({
                "technique": round(float(tech[row.name]),   1),
                "physical":  round(float(phys[row.name]),   1),
                "pace":      round(float(pace[row.name]),   1),
                "mental":    round(float(mental[row.name]), 1),
                "tactical":  round(float(tactical[row.name]),1),
                "potential": round(float(potential[row.name]),1),
            })

        df["individual_stats"] = df.apply(to_json, axis=1)
        return df

    # ─── Step 7: Final types and cleanup ─────────────────────────────────────

    def _final_types(self, df: pd.DataFrame) -> pd.DataFrame:
        # Ensure age is int
        df["age"] = df["age"].astype(int)

        # Drop internal columns
        df = df.drop(columns=["raw_score", "minutes_factor", "position"], errors="ignore")

        # Reorder with the most important columns first
        priority = [
            "name", "age", "team", "primary_position", "competition",
            "nationality", "foot", "scout_score", "scout_label",
            "minutes_played", "appearances", "goals", "assists",
            "xg", "xa", "shot_creating_actions",
            "tackles", "interceptions", "blocks", "clearances",
            "pressures", "pressure_success_rate",
            "pass_completion_rate", "progressive_passes", "key_passes",
            "individual_stats",
        ]
        ordered = [c for c in priority if c in df.columns]
        rest    = [c for c in df.columns if c not in ordered]
        return df[ordered + rest].reset_index(drop=True)
