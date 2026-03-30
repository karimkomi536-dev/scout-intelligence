import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface PlayerHistoryEntry {
  season:           string
  overall_score:    number | null
  goals:            number | null
  assists:          number | null
  minutes_played:   number | null
  appearances:      number | null
  market_value_eur: number | null
}

// Legacy alias — kept for components that already use PlayerSnapshot
export type PlayerSnapshot = PlayerHistoryEntry & {
  id:               string
  player_id:        string
  snapshot_date:    string
  xg:               number | null
  xa:               number | null
  individual_stats: Record<string, number> | null
  created_at:       string
}

export function usePlayerHistory(playerId: string | undefined) {
  const [history, setHistory]     = useState<PlayerHistoryEntry[]>([])
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
      .order('season', { ascending: true })
      .limit(30)
      .then(({ data, error }) => {
        if (!error && data) {
          const rows = data as unknown as PlayerSnapshot[]
          setSnapshots(rows)
          setHistory(rows.map(r => ({
            season:           r.season,
            overall_score:    r.overall_score,
            goals:            r.goals,
            assists:          r.assists,
            minutes_played:   r.minutes_played,
            appearances:      r.appearances,
            market_value_eur: r.market_value_eur,
          })))
        }
        setLoading(false)
      })
  }, [playerId])

  return { history, snapshots, loading }
}
