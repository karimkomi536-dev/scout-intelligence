/**
 * similarity.ts — Euclidean distance–based player similarity
 *
 * Computes distance across all 6 individual_stats axes (already normalised 0–100
 * by the pipeline). Each axis is rescaled to 0–1 before distance calculation so
 * all axes contribute equally regardless of absolute scale.
 */

import type { Player } from '../types/player'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimilarPlayer {
  player:     Player
  similarity: number   // 0–100, higher = more similar
  distance:   number   // raw euclidean distance (lower = more similar)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AXES = ['technique', 'physical', 'pace', 'mental', 'tactical', 'potential'] as const
type Axis = typeof AXES[number]

// Max theoretical distance across 6 unit-normalised axes (all 0 vs all 1)
const MAX_DISTANCE = Math.sqrt(AXES.length)  // √6 ≈ 2.449

// ── Core ──────────────────────────────────────────────────────────────────────

function euclidean(a: Player, b: Player): number {
  const sa = a.individual_stats
  const sb = b.individual_stats
  if (!sa || !sb) return MAX_DISTANCE   // treat missing stats as maximally different

  let sum = 0
  for (const axis of AXES) {
    const va = (sa[axis as Axis] ?? 0) / 100
    const vb = (sb[axis as Axis] ?? 0) / 100
    sum += (va - vb) ** 2
  }
  return Math.sqrt(sum)
}

/**
 * Find the n most similar players to `target` from `pool`.
 *
 * Filters:
 *   - Must have individual_stats
 *   - Must share the same primary_position as target
 *   - Excludes target itself
 *
 * Returns results sorted ascending by distance (most similar first).
 */
export function findSimilarPlayers(
  target:    Player,
  pool:      Player[],
  n:         number = 4,
): SimilarPlayer[] {
  if (!target.individual_stats) return []

  const candidates = pool.filter(p =>
    p.id !== target.id &&
    p.primary_position === target.primary_position &&
    p.individual_stats !== null,
  )

  const scored = candidates.map(p => ({
    player:   p,
    distance: euclidean(target, p),
  }))

  scored.sort((a, b) => a.distance - b.distance)

  return scored.slice(0, n).map(({ player, distance }) => ({
    player,
    distance,
    similarity: Math.round((1 - distance / MAX_DISTANCE) * 100),
  }))
}
