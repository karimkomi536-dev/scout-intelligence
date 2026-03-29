import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from './useOrganization'
import type { OrgPlan } from './useOrganization'

// ── Admin bypass ─────────────────────────────────────────────────────────────
// Users in this list bypass all plan gating.
// Add emails as comma-separated in VITE_ADMIN_EMAILS, or list them here.
const ADMIN_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanLimits {
  maxPlayers:   number
  canExportPDF: boolean
  canAIReport:  boolean
  maxCompare:   number
}

export interface PlanState {
  plan:         OrgPlan
  isPro:        boolean
  isEnterprise: boolean
  isAdmin:      boolean
  limits:       PlanLimits
  loading:      boolean
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlan(): PlanState {
  const { user }                          = useAuth()
  const { organization, loading }         = useOrganization()

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  const plan: OrgPlan = isAdmin
    ? 'enterprise'
    : (organization?.plan ?? 'free')

  const isPro        = plan === 'pro'
  const isEnterprise = plan === 'enterprise'

  const limits: PlanLimits = isAdmin || isEnterprise
    ? { maxPlayers: Infinity, canExportPDF: true, canAIReport: true, maxCompare: 3 }
    : plan === 'pro'
      ? { maxPlayers: 500,      canExportPDF: true,  canAIReport: true,  maxCompare: 3 }
      : { maxPlayers: 50,       canExportPDF: false, canAIReport: false, maxCompare: 2 }

  return { plan, isPro, isEnterprise, isAdmin, limits, loading }
}
