import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export function usePercentile(
  _playerId: string | undefined,
  playerScore: number,
  position: string,
  league: string,
) {
  const [allScores, setAllScores] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!position || !league) { setLoading(false); return }

    supabase
      .from('players')
      .select('scout_score')
      .eq('primary_position', position)
      .eq('competition', league)
      .not('scout_score', 'is', null)
      .then(({ data }) => {
        if (data) setAllScores(data.map(p => p.scout_score as number))
        setLoading(false)
      })
  }, [position, league])

  const percentile = useMemo(() => {
    if (!allScores.length) return null
    const sorted = [...allScores].sort((a, b) => a - b)
    const below = sorted.filter(s => s < playerScore).length
    return Math.round((below / sorted.length) * 100)
  }, [allScores, playerScore])

  return { percentile, loading, total: allScores.length }
}
