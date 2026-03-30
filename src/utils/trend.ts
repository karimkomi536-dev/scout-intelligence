export type TrendType = 'hot' | 'rising' | 'stable' | 'declining' | 'cold'

export interface TrendInfo {
  type:  TrendType
  label: string
  emoji: string
  color: string
  delta: number
}

/**
 * Compute trend from a list of historical scores (ascending chronological).
 * Compares the average of the last 3 values against the previous 3.
 */
export function getTrend(scores: number[]): TrendInfo {
  if (scores.length < 2) return _info('stable', 0)

  const last   = scores.slice(-3)
  const prior  = scores.slice(-6, -3)

  const avgLast  = avg(last)
  const avgPrior = prior.length > 0 ? avg(prior) : avgLast
  const delta    = avgLast - avgPrior

  if (delta >= 8)  return _info('hot',      delta)
  if (delta >= 3)  return _info('rising',   delta)
  if (delta >= -2) return _info('stable',   delta)
  if (delta >= -7) return _info('declining', delta)
  return _info('cold', delta)
}

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

const TREND_META: Record<TrendType, { label: string; emoji: string; color: string }> = {
  hot:       { label: 'En feu',    emoji: '🔥', color: '#ef4444' },
  rising:    { label: 'En hausse', emoji: '📈', color: '#00C896' },
  stable:    { label: 'Stable',    emoji: '➡️', color: '#9B6DFF' },
  declining: { label: 'En baisse', emoji: '📉', color: '#F5A623' },
  cold:      { label: 'En chute',  emoji: '❄️', color: '#4A5A70' },
}

function _info(type: TrendType, delta: number): TrendInfo {
  return { type, delta, ...TREND_META[type] }
}
