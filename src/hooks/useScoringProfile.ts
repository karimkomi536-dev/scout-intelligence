import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_GROUP_WEIGHTS } from '../utils/scoring'
import type { PosGroup, ScoringWeights } from '../utils/scoring'

export type ScoringProfileMap = Record<PosGroup, ScoringWeights>

interface UseScoringProfileResult {
  weights: ScoringProfileMap
  isProPlan: boolean
  orgId: string | null
  loading: boolean
}

export function useScoringProfile(): UseScoringProfileResult {
  const { user } = useAuth()
  const userId = user?.id

  const [weights, setWeights] = useState<ScoringProfileMap>({ ...DEFAULT_GROUP_WEIGHTS })
  const [isProPlan, setIsProPlan] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function load() {
      // 1. Fetch user's org + plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, organizations(plan)')
        .eq('user_id', userId!)
        .single()

      if (!profile?.organization_id) {
        setLoading(false)
        return
      }

      const org = profile as unknown as {
        organization_id: string
        organizations: { plan: string } | null
      }
      const plan = org.organizations?.plan ?? 'free'
      const isPro = plan === 'pro' || plan === 'enterprise'

      setOrgId(org.organization_id)
      setIsProPlan(isPro)

      if (!isPro) {
        setLoading(false)
        return
      }

      // 2. Fetch custom weights for this org
      const { data: profiles } = await supabase
        .from('scoring_profiles')
        .select('position_group, weights')
        .eq('organization_id', org.organization_id)

      if (profiles && profiles.length > 0) {
        const merged: ScoringProfileMap = { ...DEFAULT_GROUP_WEIGHTS }
        for (const row of profiles) {
          const group = row.position_group as PosGroup
          if (merged[group] !== undefined) {
            merged[group] = row.weights as ScoringWeights
          }
        }
        setWeights(merged)
      }

      setLoading(false)
    }

    load()
  }, [userId])

  return { weights, isProPlan, orgId, loading }
}
