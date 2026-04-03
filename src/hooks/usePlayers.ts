import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Player } from '../types/player'

export interface PlayerQueryFilters {
  search?:      string
  positions?:   string[]
  leagues?:     string[]
  nationality?: string
  ageMin?:      number
  ageMax?:      number
  foot?:        string
  minScore?:    number
  minValueM?:   number
  maxValueM?:   number
  xgMin?:       number
  minutesMin?:  number
  labels?:      string[]
}

export function usePlayers(filters: PlayerQueryFilters) {
  return useQuery({
    queryKey: ['players', filters],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase.from('players').select('*')

      if (filters.nationality)                       q = q.eq('nationality', filters.nationality)
      if (filters.search)                          q = q.ilike('name', `%${filters.search}%`)
      if (filters.positions?.length)               q = q.in('primary_position', filters.positions)
      if (filters.leagues?.length)                 q = q.in('competition', filters.leagues)
      if (filters.ageMin && filters.ageMin > 16)   q = q.gte('age', filters.ageMin)
      if (filters.ageMax && filters.ageMax < 40)   q = q.lte('age', filters.ageMax)
      if (filters.foot === 'Left')                 q = q.ilike('foot', '%left%')
      if (filters.foot === 'Right')                q = q.ilike('foot', '%right%')
      if (filters.minScore && filters.minScore > 0)      q = q.gte('scout_score', filters.minScore)
      if (filters.minValueM && filters.minValueM > 0)   q = q.gte('market_value_eur', filters.minValueM * 1_000_000)
      if (filters.maxValueM && filters.maxValueM > 0)   q = q.lte('market_value_eur', filters.maxValueM * 1_000_000)
      if (filters.xgMin && filters.xgMin > 0)          q = q.gte('xg', filters.xgMin)
      if (filters.minutesMin && filters.minutesMin > 0) q = q.gte('minutes_played', filters.minutesMin)
      if (filters.labels?.length)                  q = q.in('scout_label', filters.labels)

      q = q.order('scout_score', { ascending: false })

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Player[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
