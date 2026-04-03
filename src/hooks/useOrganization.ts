import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type OrgPlan = 'free' | 'pro' | 'enterprise'
export type OrgRole = 'admin' | 'scout' | 'viewer'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  created_at: string
}

export interface OrganizationState {
  organization: Organization | null
  role: OrgRole | null
  loading: boolean
  error: string | null
  /** Bascule vers une autre organisation (si le user en a plusieurs) */
  switchOrganization: (orgId: string) => Promise<void>
}

// Error codes that mean "no data" — not retriable, not fatal
const NO_DATA_CODES = new Set(['PGRST116', '406'])

export function useOrganization(): OrganizationState {
  const { user } = useAuth()

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [role, setRole]                 = useState<OrgRole | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  // Guard: fetch exactly once per user session — never re-run on TOKEN_REFRESHED
  const fetchedRef  = useRef(false)
  const retryCount  = useRef(0)

  useEffect(() => {
    // User logged out — reset everything so next login triggers a fresh fetch
    if (!user) {
      fetchedRef.current = false
      setOrganization(null)
      setRole(null)
      setLoading(false)
      return
    }

    // Already fetched for this session — do nothing
    if (fetchedRef.current) return

    fetchOrganization(user.id)
  }, [user?.id]) // ← stable primitive: won't re-run on TOKEN_REFRESHED

  async function fetchOrganization(userId: string) {
    if (retryCount.current > 3) { setLoading(false); return }
    retryCount.current++
    setLoading(true)
    setError(null)

    try {
      // 1. Profile → get active org id
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        // No profile row yet (new account) → free plan, not an error
        if (NO_DATA_CODES.has(profileError.code)) {
          setOrganization(null)
          setRole(null)
          return
        }
        throw profileError
      }

      const activeOrgId = data?.organization_id

      if (!activeOrgId) {
        // Authenticated but not yet in an org → free plan
        setOrganization(null)
        setRole(null)
        return
      }

      // 2. Org details + member role in parallel
      const [orgResult, memberResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, slug, plan, created_at')
          .eq('id', activeOrgId)
          .single(),

        supabase
          .from('user_organizations')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', activeOrgId)
          .single(),
      ])

      // 406 / PGRST116 from either table → org not accessible, fall back to free
      if (orgResult.error) {
        if (NO_DATA_CODES.has(orgResult.error.code)) {
          setOrganization(null)
          setRole(null)
          return
        }
        throw orgResult.error
      }

      setOrganization(orgResult.data as Organization)
      setRole((memberResult.data?.role as OrgRole) ?? null)

    } catch (err) {
      console.error('fetchOrganization error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load organization')
      setOrganization(null)
      setRole(null)
    } finally {
      // Mark as done — success or error, do not retry automatically
      fetchedRef.current = true
      setLoading(false)
    }
  }

  /**
   * Manually switch active org. Resets the guard so the new org is fetched.
   */
  async function switchOrganization(orgId: string) {
    if (!user) return

    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ organization_id: orgId, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Allow fetchOrganization to run again for the new org
    fetchedRef.current = false
    await fetchOrganization(user.id)
  }

  return { organization, role, loading, error, switchOrganization }
}
