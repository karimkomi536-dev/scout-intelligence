/**
 * scoring.ts — VIZION position-aware scoring system
 *
 * calculateScore uses the individual_stats axes (already normalised 0-100 by the Python
 * pipeline) and applies position-specific weights to produce a single 0-100 score.
 *
 * Axis mapping to user-facing categories:
 *   technique  → Technique / Passing quality
 *   physical   → Physical workload
 *   pace       → Pace / Dribbling (positional + age heuristic)
 *   mental     → Mental / Shooting (shot-creating actions, pressure success)
 *   tactical   → Defence / Tactical (tackles, interceptions, progressive passes)
 *   potential  → Potential (youth bonus, not weighted in final score)
 */

import type { Player, ScoreLabel } from '../types/player'

// ── Types ─────────────────────────────────────────────────────────────────────

type Axis = 'technique' | 'physical' | 'pace' | 'mental' | 'tactical' | 'potential'

interface ScoreWeights {
  technique?: number
  physical?: number
  pace?: number
  mental?: number
  tactical?: number
  potential?: number
}

export interface ScoreBreakdown {
  axis: string
  p1: number
  p2: number
  winner: 'p1' | 'p2' | 'tie'
}

export interface CompareResult {
  winner: 'p1' | 'p2' | 'tie'
  delta: number
  breakdown: ScoreBreakdown[]
}

// ── Position weight profiles ──────────────────────────────────────────────────
// Weights sum to 1.0. `potential` intentionally excluded from scoring weight
// (it inflates young players artificially when comparing across cohorts).

const WEIGHTS: Record<string, ScoreWeights> = {
  // Goalkeepers: defence-first
  GK:  { tactical: 0.40, physical: 0.25, mental: 0.20, technique: 0.15 },

  // Defenders: defensive solidity + physicality
  CB:  { tactical: 0.35, physical: 0.25, technique: 0.20, mental: 0.20 },
  RB:  { tactical: 0.35, physical: 0.25, technique: 0.20, mental: 0.20 },
  LB:  { tactical: 0.35, physical: 0.25, technique: 0.20, mental: 0.20 },

  // Midfielders: passing + mental reads + physical engine
  CDM: { technique: 0.25, mental: 0.25, physical: 0.20, tactical: 0.30 },
  CM:  { technique: 0.30, mental: 0.25, physical: 0.20, tactical: 0.25 },
  CAM: { technique: 0.35, mental: 0.30, pace: 0.15, physical: 0.10, tactical: 0.10 },

  // Attackers: shooting instinct + pace + technique
  RW:  { mental: 0.35, pace: 0.25, technique: 0.25, physical: 0.15 },
  LW:  { mental: 0.35, pace: 0.25, technique: 0.25, physical: 0.15 },
  ST:  { mental: 0.35, pace: 0.25, technique: 0.25, physical: 0.15 },
}

// Fallback for unlisted positions (balanced)
const DEFAULT_WEIGHTS: ScoreWeights = {
  technique: 0.20, physical: 0.20, pace: 0.15, mental: 0.20, tactical: 0.25,
}

// ── Radar axis order by position (most relevant first) ────────────────────────

const RADAR_AXES: Record<string, string[]> = {
  GK:  ['Tactical', 'Physical', 'Mental', 'Technique', 'Potential', 'Pace'],
  CB:  ['Tactical', 'Physical', 'Technique', 'Mental', 'Potential', 'Pace'],
  RB:  ['Tactical', 'Physical', 'Technique', 'Pace', 'Mental', 'Potential'],
  LB:  ['Tactical', 'Physical', 'Technique', 'Pace', 'Mental', 'Potential'],
  CDM: ['Tactical', 'Technique', 'Mental', 'Physical', 'Potential', 'Pace'],
  CM:  ['Technique', 'Mental', 'Tactical', 'Physical', 'Potential', 'Pace'],
  CAM: ['Technique', 'Mental', 'Pace', 'Tactical', 'Physical', 'Potential'],
  RW:  ['Mental', 'Pace', 'Technique', 'Physical', 'Potential', 'Tactical'],
  LW:  ['Mental', 'Pace', 'Technique', 'Physical', 'Potential', 'Tactical'],
  ST:  ['Mental', 'Pace', 'Technique', 'Physical', 'Potential', 'Tactical'],
}

const DEFAULT_AXES = ['Technique', 'Physical', 'Pace', 'Mental', 'Tactical', 'Potential']

// ── Label thresholds ──────────────────────────────────────────────────────────

const LABEL_THRESHOLDS: { min: number; label: ScoreLabel }[] = [
  { min: 75, label: 'ELITE' },
  { min: 60, label: 'TOP PROSPECT' },
  { min: 45, label: 'INTERESTING' },
  { min: 30, label: 'TO MONITOR' },
  { min: 0,  label: 'LOW PRIORITY' },
]

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Recalculate a player's score using position-specific weights applied to their
 * individual_stats axes. Returns the stored scout_score if individual_stats is absent.
 */
export function calculateScore(player: Player): number {
  if (!player.individual_stats) return player.scout_score ?? 0

  const stats = player.individual_stats
  const weights = WEIGHTS[player.primary_position] ?? DEFAULT_WEIGHTS

  let score = 0
  let totalWeight = 0

  for (const [axis, weight] of Object.entries(weights) as [Axis, number][]) {
    const value = stats[axis] ?? 0
    score += value * weight
    totalWeight += weight
  }

  // Normalise in case weights don't sum exactly to 1.0
  const raw = totalWeight > 0 ? score / totalWeight : 0
  return Math.round(Math.min(100, Math.max(0, raw)))
}

/**
 * Map a numeric score to a scouting label.
 */
export function getScoreLabel(score: number): ScoreLabel {
  return LABEL_THRESHOLDS.find(t => score >= t.min)?.label ?? 'LOW PRIORITY'
}

/**
 * Return the 6 radar axes ordered by relevance for a given position.
 * Most important axis first — callers can use this to reorder the radar chart.
 */
export function getRadarAxes(position: string): string[] {
  return RADAR_AXES[position] ?? DEFAULT_AXES
}

/**
 * Compare two players and return the winner, score delta, and per-axis breakdown.
 * Uses individual_stats directly for axis-level comparison.
 */
export function compareScores(p1: Player, p2: Player): CompareResult {
  const s1 = calculateScore(p1)
  const s2 = calculateScore(p2)

  const axes: Axis[] = ['technique', 'physical', 'pace', 'mental', 'tactical', 'potential']
  const breakdown: ScoreBreakdown[] = axes.map(axis => {
    const v1 = p1.individual_stats?.[axis] ?? 0
    const v2 = p2.individual_stats?.[axis] ?? 0
    const winner = v1 > v2 ? 'p1' : v2 > v1 ? 'p2' : 'tie'
    return {
      axis: axis.charAt(0).toUpperCase() + axis.slice(1),
      p1: v1,
      p2: v2,
      winner,
    }
  })

  return {
    winner: s1 > s2 ? 'p1' : s2 > s1 ? 'p2' : 'tie',
    delta: Math.abs(s1 - s2),
    breakdown,
  }
}
