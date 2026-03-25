import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface PlayerSnapshot {
  id: string
  player_id: string
  overall_score: number
  individual_stats: Record<string, number> | null
  snapshot_date: string
  created_at: string
}

export function usePlayerHistory(playerId: string | undefined) {
  const [snapshots, setSnapshots] = useState<PlayerSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) {
      setLoading(false)
      return
    }

    supabase
      .from('player_history')
      .select('id, player_id, overall_score, individual_stats, snapshot_date, created_at')
      .eq('player_id', playerId)
      .order('snapshot_date', { ascending: true })
      .limit(30)
      .then(({ data }) => {
        if (data) setSnapshots(data as PlayerSnapshot[])
        setLoading(false)
      })
  }, [playerId])

  return { snapshots, loading }
}
