import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { findSimilarPlayers } from '../utils/similarity'
import type { Player } from '../types/player'
import type { SimilarPlayer } from '../utils/similarity'

export function useSimilarPlayers(player: Player | null, n: number = 4): {
  similar: SimilarPlayer[]
  loading: boolean
} {
  const [pool, setPool]       = useState<Player[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch all players at the same position (excluding current)
  useEffect(() => {
    if (!player?.individual_stats) return
    setLoading(true)

    supabase
      .from('players')
      .select('id,name,age,team,primary_position,competition,nationality,foot,scout_score,scout_label,individual_stats')
      .eq('primary_position', player.primary_position)
      .neq('id', player.id)
      .not('individual_stats', 'is', null)
      .then(({ data }) => {
        setPool((data ?? []) as Player[])
        setLoading(false)
      })
  }, [player?.id, player?.primary_position])   // stable primitives — no object ref loop

  const similar = useMemo(
    () => (player ? findSimilarPlayers(player, pool, n) : []),
    [player, pool, n],
  )

  return { similar, loading }
}
