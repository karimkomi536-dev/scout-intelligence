import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { COUNTRY_COORDS } from '../data/country-coordinates'
import type { GlobePin } from '../components/Globe/Globe'

// Label priority: higher index = better
const LABEL_RANK: Record<string, number> = {
  'LOW PRIORITY': 0,
  'TO MONITOR':   1,
  'INTERESTING':  2,
  'TOP PROSPECT': 3,
  'ELITE':        4,
}

export function useGlobeData(labelFilter?: string) {
  return useQuery({
    queryKey: ['globe-data', labelFilter ?? 'all'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('players')
        .select('nationality, scout_label, overall_score, is_u23')
        .not('nationality', 'is', null)

      if (labelFilter === 'U23') {
        q = q.eq('is_u23', true)
      } else if (labelFilter && labelFilter !== 'all') {
        q = q.eq('scout_label', labelFilter)
      }

      const { data, error } = await q
      if (error) throw error

      // Group by nationality
      const byCountry = new Map<string, {
        count:       number
        bestLabel:   string
        labelCounts: Partial<Record<string, number>>
      }>()

      for (const row of (data ?? []) as Array<{ nationality: string; scout_label: string | null }>) {
        const nat = row.nationality
        if (!nat || !COUNTRY_COORDS[nat]) continue

        const rowLabel = row.scout_label ?? 'LOW PRIORITY'
        const existing = byCountry.get(nat)

        if (!existing) {
          byCountry.set(nat, {
            count:       1,
            bestLabel:   rowLabel,
            labelCounts: { [rowLabel]: 1 },
          })
        } else {
          existing.count++
          existing.labelCounts[rowLabel] = (existing.labelCounts[rowLabel] ?? 0) + 1
          if ((LABEL_RANK[rowLabel] ?? 0) > (LABEL_RANK[existing.bestLabel] ?? 0)) {
            existing.bestLabel = rowLabel
          }
        }
      }

      const pins: GlobePin[] = []
      for (const [country, { count, bestLabel, labelCounts }] of byCountry) {
        const coords = COUNTRY_COORDS[country]
        if (!coords) continue
        pins.push({
          country,
          lat:         coords.lat,
          lng:         coords.lng,
          count,
          label:       bestLabel,
          labelCounts,
        })
      }

      return pins
    },
    staleTime: 10 * 60 * 1000,
  })
}
