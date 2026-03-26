import { useEffect, useState } from 'react'
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

export function useOrganization(): OrganizationState {
  const { user } = useAuth()

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [role, setRole] = useState<OrgRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setOrganization(null)
      setRole(null)
      setLoading(false)
      return
    }

    fetchOrganization(user.id)
  }, [user])

  async function fetchOrganization(userId: string) {
    setLoading(true)
    setError(null)

    try {
      // 1. Récupère le profil complet (select * pour éviter 406 sur colonnes manquantes)
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      console.log('Profile fetch result:', data, profileError)

      // PGRST116 = no rows found (user sans profil) — traiter comme plan free, ne pas crasher
      if (profileError) {
        if (profileError.code === 'PGRST116' || profileError.code === '406') {
          console.log('No profile row found — defaulting to free plan')
          setOrganization(null)
          setRole(null)
          setLoading(false)
          return
        }
        throw profileError
      }

      const activeOrgId = data?.organization_id

      if (!activeOrgId) {
        // User sans org (nouveau compte, pas encore invité)
        setOrganization(null)
        setRole(null)
        setLoading(false)
        return
      }

      // 2. Récupère les détails de l'org et le rôle en parallèle
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

      if (orgResult.error) throw orgResult.error

      setOrganization(orgResult.data as Organization)
      setRole((memberResult.data?.role as OrgRole) ?? null)
    } catch (err) {
      console.error('fetchOrganization error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load organization')
      setOrganization(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Bascule l'organisation active d'un user (si membre de plusieurs orgs).
   * Met à jour profiles.organization_id côté Supabase et recharge l'état local.
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

    // Recharge avec la nouvelle org active
    await fetchOrganization(user.id)
  }

  return { organization, role, loading, error, switchOrganization }
}
