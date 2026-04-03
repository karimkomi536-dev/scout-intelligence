import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Player } from '../types/player'

export function usePlayer(id: string | undefined) {
  return useQuery({
    queryKey: ['player', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Player
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}
