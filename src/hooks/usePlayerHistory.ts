import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface PlayerSnapshot {
  id:               string
  player_id:        string
  season:           string
  snapshot_date:    string
  overall_score:    number | null
  goals:            number | null
  assists:          number | null
  xg:               number | null
  xa:               number | null
  minutes_played:   number | null
  appearances:      number | null
  market_value_eur: number | null
  individual_stats: Record<string, number> | null
  created_at:       string
}

export function usePlayerHistory(playerId: string | undefined) {
  const [snapshots, setSnapshots] = useState<PlayerSnapshot[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!playerId) {
      setLoading(false)
      return
    }

    supabase
      .from('player_history')
      .select(
        'id, player_id, season, snapshot_date, overall_score, ' +
        'goals, assists, xg, xa, minutes_played, appearances, ' +
        'market_value_eur, individual_stats, created_at'
      )
      .eq('player_id', playerId)
      .order('snapshot_date', { ascending: true })
      .limit(30)
      .then(({ data }) => {
        if (data) setSnapshots(data as unknown as PlayerSnapshot[])
        setLoading(false)
      })
  }, [playerId])

  return { snapshots, loading }
}
