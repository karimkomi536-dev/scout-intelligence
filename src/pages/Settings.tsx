import { useState, useEffect } from 'react'
import {
  Lock, Save, RotateCcw, CheckCircle,
  UserPlus, Trash2, X, Users, Mail,
  ArrowLeftRight, CalendarClock, Bell,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useScoringProfile } from '../hooks/useScoringProfile'
import { useOrganization } from '../hooks/useOrganization'
import { calculateScore, getScoreLabel, DEFAULT_GROUP_WEIGHTS, getPosGroup } from '../utils/scoring'
import type { PosGroup, ScoringWeights } from '../utils/scoring'
import type { OrgRole } from '../hooks/useOrganization'
import type { Player } from '../types/player'
import { useAlertPrefs } from '../hooks/useAlertPrefs'
import { useIsMobile } from '../hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'

// ── Scoring types & helpers ───────────────────────────────────────────────────

type WeightKey = keyof ScoringWeights

const WEIGHT_KEYS: WeightKey[] = ['technique', 'physical', 'pace', 'mental', 'tactical', 'potential']

const WEIGHT_LABELS: Record<WeightKey, string> = {
  technique: 'Technique',
  physical:  'Physique',
  pace:      'Vitesse',
  mental:    'Mental',
  tactical:  'Tactique',
  potential: 'Potentiel',
}

const WEIGHT_COLORS: Record<WeightKey, string> = {
  technique: '#4D7FFF',
  physical:  '#00C896',
  pace:      '#22D4E8',
  mental:    '#9B6DFF',
  tactical:  '#F5A623',
  potential: '#ec4899',
}

const POS_GROUPS: PosGroup[] = ['GK', 'DEF', 'MID', 'ATT']

const POS_GROUP_LABELS: Record<PosGroup, string> = {
  GK:  'Gardien (GK)',
  DEF: 'Défenseur (DEF)',
  MID: 'Milieu (MID)',
  ATT: 'Attaquant (ATT)',
}

function toPercent(w: ScoringWeights): Record<WeightKey, number> {
  const result = {} as Record<WeightKey, number>
  for (const key of WEIGHT_KEYS) result[key] = Math.round((w[key] ?? 0) * 100)
  return result
}

function fromPercent(p: Record<WeightKey, number>): ScoringWeights {
  const result = {} as ScoringWeights
  for (const key of WEIGHT_KEYS) if (p[key] > 0) result[key] = p[key] / 100
  return result
}

function sum(p: Record<WeightKey, number>): number {
  return WEIGHT_KEYS.reduce((acc, k) => acc + (p[k] ?? 0), 0)
}

// ── Team types & helpers ──────────────────────────────────────────────────────

type OrgMember = { user_id: string; role: OrgRole }

type PendingInvitation = {
  id: string
  email: string
  role: OrgRole
  expires_at: string
  created_at: string
}

const ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: 'admin',  label: 'Administrateur' },
  { value: 'scout',  label: 'Scout'           },
  { value: 'viewer', label: 'Lecteur'         },
]

const ROLE_COLORS: Record<OrgRole, string> = {
  admin:  '#F5A623',
  scout:  '#4D7FFF',
  viewer: '#5A7090',
}

const ROLE_BG: Record<OrgRole, string> = {
  admin:  'rgba(245,166,35,0.14)',
  scout:  'rgba(77,127,255,0.14)',
  viewer: 'rgba(90,112,144,0.14)',
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function shortId(uid: string): string {
  return uid.slice(0, 8).toUpperCase()
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '24px',
    }}>
      {children}
    </section>
  )
}

function SectionHeader({
  title, subtitle, badge, action,
}: {
  title: string
  subtitle: string
  badge?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h2>
          {badge}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  )
}

function PlanGate({
  planLabel, description, ctaText = 'Mettre à niveau →',
}: {
  planLabel: string
  description: string
  ctaText?: string
}) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 16px',
        background: 'rgba(155,109,255,0.12)',
        border: '1px solid rgba(155,109,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9B6DFF',
      }}>
        <Lock size={20} />
      </div>
      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        Fonctionnalité {planLabel}
      </p>
      <p style={{
        fontSize: '13px', color: 'var(--text-muted)',
        maxWidth: '360px', margin: '0 auto 20px', lineHeight: 1.6,
      }}>
        {description}
      </p>
      <button style={{
        background: 'linear-gradient(135deg,#9B6DFF,#4D7FFF)',
        border: 'none', borderRadius: '10px',
        color: 'white', fontWeight: 700, fontSize: '13px',
        padding: '10px 24px', cursor: 'pointer',
      }}>
        {ctaText}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth()
  const { weights: orgWeights, isProPlan, orgId, loading } = useScoringProfile()
  const { organization, role: currentUserRole } = useOrganization()
  const { prefs: alertPrefs, toggle: toggleAlert } = useAlertPrefs()
  const { showToast } = useToast()

  const isEnterprise = organization?.plan === 'enterprise'
  const isAdmin = currentUserRole === 'admin'

  // ── Scoring state ──────────────────────────────────────────────────────────

  const [editWeights, setEditWeights] = useState<Record<PosGroup, Record<WeightKey, number>>>(() => ({
    GK:  toPercent(DEFAULT_GROUP_WEIGHTS.GK),
    DEF: toPercent(DEFAULT_GROUP_WEIGHTS.DEF),
    MID: toPercent(DEFAULT_GROUP_WEIGHTS.MID),
    ATT: toPercent(DEFAULT_GROUP_WEIGHTS.ATT),
  }))
  const [activeTab, setActiveTab]       = useState<PosGroup>('ATT')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [previewPlayer, setPreviewPlayer] = useState<Player | null>(null)

  useEffect(() => {
    if (!loading) {
      setEditWeights({
        GK:  toPercent(orgWeights.GK),
        DEF: toPercent(orgWeights.DEF),
        MID: toPercent(orgWeights.MID),
        ATT: toPercent(orgWeights.ATT),
      })
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase
      .from('players')
      .select('id,name,primary_position,scout_score,individual_stats')
      .in('primary_position', ['ST', 'LW', 'RW', 'ATT'])
      .not('individual_stats', 'is', null)
      .order('scout_score', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.[0]) setPreviewPlayer(data[0] as Player) })
  }, [])

  const current    = editWeights[activeTab]
  const total      = sum(current)
  const isValid    = total === 100

  function setSlider(key: WeightKey, value: number) {
    setEditWeights(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [key]: value } }))
    setSaved(false)
  }

  function resetToDefault() {
    setEditWeights(prev => ({ ...prev, [activeTab]: toPercent(DEFAULT_GROUP_WEIGHTS[activeTab]) }))
    setSaved(false)
  }

  async function handleSave() {
    if (!orgId || !isValid) return
    setSaving(true)
    try {
      const payload = POS_GROUPS.map(group => ({
        organization_id: orgId,
        position_group:  group,
        weights:         fromPercent(editWeights[group]),
      }))
      await supabase
        .from('scoring_profiles')
        .upsert(payload, { onConflict: 'organization_id,position_group' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      showToast('Profil de scoring sauvegardé', 'success')
    } finally {
      setSaving(false)
    }
  }

  const previewScore = previewPlayer
    ? calculateScore(previewPlayer, fromPercent(editWeights[getPosGroup(previewPlayer.primary_position)]))
    : null
  const previewLabel = previewScore !== null ? getScoreLabel(previewScore) : null

  // ── Team state ─────────────────────────────────────────────────────────────

  const [members, setMembers]               = useState<OrgMember[]>([])
  const [pendingInvitations, setPendingInv] = useState<PendingInvitation[]>([])
  const [loadingTeam, setLoadingTeam]       = useState(false)
  const [inviteModalOpen, setInviteModal]   = useState(false)
  const [inviteEmail, setInviteEmail]       = useState('')
  const [inviteRole, setInviteRole]         = useState<OrgRole>('scout')
  const [inviting, setInviting]             = useState(false)
  const [inviteError, setInviteError]       = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess]   = useState(false)
  const [removingId, setRemovingId]         = useState<string | null>(null)
  const [revokingId, setRevokingId]         = useState<string | null>(null)

  useEffect(() => {
    if (orgId && isEnterprise) fetchTeamData()
  }, [orgId, isEnterprise]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTeamData() {
    setLoadingTeam(true)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        supabase
          .from('user_organizations')
          .select('user_id, role')
          .eq('organization_id', orgId),
        supabase
          .from('invitations')
          .select('id, email, role, expires_at, created_at')
          .eq('organization_id', orgId)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ])
      if (membersRes.data) setMembers(membersRes.data as OrgMember[])
      if (invitesRes.data) setPendingInv(invitesRes.data as PendingInvitation[])
    } finally {
      setLoadingTeam(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !orgId || !user) return
    setInviting(true)
    setInviteError(null)
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email:           inviteEmail.trim().toLowerCase(),
          role:            inviteRole,
          organization_id: orgId,
          invited_by:      user.id,
        })
        .select('token')
        .single()

      if (error) throw error

      // Send email (best-effort — invitation exists in DB regardless)
      fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:   inviteEmail.trim(),
          token:   data.token,
          orgName: organization?.name,
          role:    inviteRole,
        }),
      }).catch(console.warn)

      showToast('Invitation envoyée', 'success')
      setInviteSuccess(true)
      setTimeout(() => {
        setInviteModal(false)
        setInviteSuccess(false)
        setInviteEmail('')
        setInviteRole('scout')
        fetchTeamData()
      }, 1500)
    } catch (err: any) {
      setInviteError(err.message || 'Erreur lors de l\'invitation')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!orgId) return
    setRemovingId(userId)
    try {
      await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', orgId)
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    } finally {
      setRemovingId(null)
    }
  }

  async function handleRevokeInvitation(id: string) {
    setRevokingId(id)
    try {
      await supabase.from('invitations').delete().eq('id', id)
      setPendingInv(prev => prev.filter(i => i.id !== id))
    } finally {
      setRevokingId(null)
    }
  }

  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'scoring' | 'equipe' | 'alertes'>('scoring')

  // ── Loading guard ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Chargement…
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>

      <div style={{ display: !isMobile ? 'grid' : 'block', gridTemplateColumns: !isMobile ? '200px 1fr' : undefined, gap: !isMobile ? '32px' : undefined, alignItems: 'flex-start' }}>

        {/* ── LEFT NAV (desktop only) ─────────────────────────────────────── */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: '24px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', margin: '0 0 8px' }}>
              Paramètres
            </p>
            {([
              { id: 'scoring' as const, label: 'Scoring', icon: '⚡' },
              { id: 'equipe' as const, label: 'Organisation', icon: '👥' },
              { id: 'alertes' as const, label: 'Alertes', icon: '🔔' },
            ] as const).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '9px 12px', marginBottom: '2px',
                  background: activeSection === id ? 'rgba(77,127,255,0.12)' : 'none',
                  border: `1px solid ${activeSection === id ? 'rgba(77,127,255,0.30)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: activeSection === id ? '#4D7FFF' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: activeSection === id ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ fontSize: '14px' }}>{icon}</span>
                {label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />
            <button
              onClick={() => navigate('/settings/billing')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '9px 12px',
                background: 'none', border: '1px solid transparent', borderRadius: '8px',
                color: 'var(--text-muted)', fontSize: '13px', fontWeight: 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none' }}
            >
              <span style={{ fontSize: '14px' }}>💳</span>
              Facturation
            </button>
          </div>
        )}

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Paramètres
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            Scoring, équipe et gestion de votre organisation.
          </p>

          {/* ── SCORING SECTION ──────────────────────────────────────────── */}
          {(isMobile || activeSection === 'scoring') && (
          <SectionCard>

        <SectionHeader
          title="Pondérations de scoring"
          subtitle="Ajustez l'importance de chaque critère par groupe de position"
          badge={!isProPlan ? (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(155,109,255,0.12)',
              border: '1px solid rgba(155,109,255,0.30)',
              borderRadius: '20px', padding: '4px 10px',
              fontSize: '11px', fontWeight: 700, color: '#9B6DFF',
            }}>
              <Lock size={10} /> Pro+
            </span>
          ) : undefined}
        />

        {!isProPlan ? (
          <PlanGate
            planLabel="Pro+"
            description="Les pondérations personnalisées sont réservées aux plans Pro et Enterprise. Adaptez le scoring à votre méthodologie."
            ctaText="Passer à Pro →"
          />
        ) : (
          <div style={{ padding: '24px' }}>
            {/* Position group tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {POS_GROUPS.map(group => (
                <button
                  key={group}
                  onClick={() => setActiveTab(group)}
                  style={{
                    padding: '6px 16px', borderRadius: '20px',
                    border: `1px solid ${activeTab === group ? '#4D7FFF' : 'rgba(255,255,255,0.10)'}`,
                    background: activeTab === group ? 'rgba(77,127,255,0.16)' : 'transparent',
                    color: activeTab === group ? '#4D7FFF' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: activeTab === group ? 700 : 400,
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                >
                  {POS_GROUP_LABELS[group]}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {WEIGHT_KEYS.map(key => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: WEIGHT_COLORS[key] }}>
                      {WEIGHT_LABELS[key]}
                    </span>
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: current[key] > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {current[key]}%
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={current[key]}
                    onChange={e => setSlider(key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: WEIGHT_COLORS[key], cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>

            {/* Sum indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px', marginBottom: '20px',
              background: isValid
                ? 'rgba(0,200,150,0.08)'
                : total > 100 ? 'rgba(239,68,68,0.10)' : 'rgba(245,166,35,0.08)',
              border: `1px solid ${isValid ? 'rgba(0,200,150,0.25)' : total > 100 ? 'rgba(239,68,68,0.25)' : 'rgba(245,166,35,0.25)'}`,
            }}>
              <span style={{
                fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: isValid ? '#00C896' : total > 100 ? '#ef4444' : '#F5A623',
              }}>
                Total : {total}%
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isValid ? '— Valide ✓' : total > 100 ? `— Dépassement de ${total - 100}%` : `— Il manque ${100 - total}%`}
              </span>
            </div>

            {/* Live preview */}
            {previewPlayer && previewScore !== null && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                background: 'rgba(77,127,255,0.06)', border: '1px solid rgba(77,127,255,0.15)',
                fontSize: '12px', color: 'var(--text-secondary)',
              }}>
                Avec ces pondérations,{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{previewPlayer.name}</strong>{' '}
                serait{' '}
                <strong style={{ color: '#4D7FFF' }}>{previewLabel} ({previewScore})</strong>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={resetToDefault}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'none', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px', color: 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 600, padding: '9px 16px',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <RotateCcw size={13} /> Réinitialiser
              </button>

              <button
                onClick={handleSave}
                disabled={!isValid || saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: saved
                    ? 'rgba(0,200,150,0.18)'
                    : isValid ? 'rgba(77,127,255,0.20)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${saved ? 'rgba(0,200,150,0.35)' : isValid ? 'rgba(77,127,255,0.40)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px',
                  color: saved ? '#00C896' : isValid ? '#4D7FFF' : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 700, padding: '9px 20px',
                  cursor: isValid && !saving ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease', opacity: saving ? 0.7 : 1,
                }}
              >
                {saved
                  ? <><CheckCircle size={13} /> Sauvegardé</>
                  : <><Save size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}</>}
              </button>
            </div>
          </div>
        )}
      </SectionCard>
          )}

          {/* ── TEAM SECTION ─────────────────────────────────────────────── */}
          {(isMobile || activeSection === 'equipe') && (
          <SectionCard>
        <SectionHeader
          title="Équipe"
          subtitle="Gérez les membres et les invitations de votre organisation"
          badge={
            <span style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(155,109,255,0.12)',
              border: '1px solid rgba(155,109,255,0.30)',
              borderRadius: '20px', padding: '4px 10px',
              fontSize: '11px', fontWeight: 700, color: '#9B6DFF',
            }}>
              <Lock size={10} /> Enterprise
            </span>
          }
          action={isEnterprise && isAdmin ? (
            <button
              onClick={() => setInviteModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(77,127,255,0.18)',
                border: '1px solid rgba(77,127,255,0.35)',
                borderRadius: '10px', padding: '8px 14px',
                color: '#4D7FFF', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <UserPlus size={13} /> Inviter
            </button>
          ) : undefined}
        />

        {!isEnterprise ? (
          <PlanGate
            planLabel="Enterprise"
            description="La gestion d'équipe multi-scouts avec invitations et contrôle des accès est réservée au plan Enterprise."
            ctaText="Passer à Enterprise →"
          />
        ) : (
          <div style={{ padding: '20px 24px' }}>

            {/* Members list */}
            <p style={{
              fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
              letterSpacing: '0.10em', textTransform: 'uppercase',
              marginBottom: '12px',
            }}>
              Membres ({members.length})
            </p>

            {loadingTeam ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chargement…</p>
            ) : members.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Aucun membre trouvé.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {members.map(member => {
                  const isSelf = member.user_id === user?.id
                  return (
                    <div
                      key={member.user_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(77,127,255,0.20)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700, color: '#4D7FFF',
                      }}>
                        <Users size={14} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {isSelf ? user?.email : `Membre ${shortId(member.user_id)}`}
                          {isSelf && (
                            <span style={{
                              marginLeft: '8px', fontSize: '10px', fontWeight: 700,
                              background: 'rgba(0,200,150,0.14)',
                              color: '#00C896', padding: '2px 7px',
                              borderRadius: '20px',
                            }}>
                              Vous
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Role badge */}
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                        borderRadius: '20px',
                        color: ROLE_COLORS[member.role],
                        background: ROLE_BG[member.role],
                      }}>
                        {ROLE_OPTIONS.find(r => r.value === member.role)?.label ?? member.role}
                      </span>

                      {/* Remove (admin only, not self) */}
                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removingId === member.user_id}
                          title="Retirer le membre"
                          style={{
                            background: 'none',
                            border: '1px solid rgba(239,68,68,0.20)',
                            borderRadius: '8px', padding: '5px 7px',
                            color: '#ef4444', cursor: 'pointer',
                            opacity: removingId === member.user_id ? 0.5 : 1,
                            display: 'flex', alignItems: 'center',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pending invitations */}
            {isAdmin && (
              <>
                <p style={{
                  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  margin: '0 0 12px',
                }}>
                  Invitations en attente ({pendingInvitations.length})
                </p>

                {pendingInvitations.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Aucune invitation en attente.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pendingInvitations.map(inv => (
                      <div
                        key={inv.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 14px', borderRadius: '10px',
                          background: 'rgba(245,166,35,0.04)',
                          border: '1px solid rgba(245,166,35,0.12)',
                        }}
                      >
                        <Mail size={14} color="#F5A623" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: '13px', fontWeight: 600,
                            color: 'var(--text-primary)', margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {inv.email}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                            Expire dans {daysUntil(inv.expires_at)} jour{daysUntil(inv.expires_at) > 1 ? 's' : ''}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                          borderRadius: '20px',
                          color: ROLE_COLORS[inv.role],
                          background: ROLE_BG[inv.role],
                        }}>
                          {ROLE_OPTIONS.find(r => r.value === inv.role)?.label ?? inv.role}
                        </span>
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          disabled={revokingId === inv.id}
                          title="Révoquer l'invitation"
                          style={{
                            background: 'none',
                            border: '1px solid rgba(239,68,68,0.20)',
                            borderRadius: '8px', padding: '5px 7px',
                            color: '#ef4444', cursor: 'pointer',
                            opacity: revokingId === inv.id ? 0.5 : 1,
                            display: 'flex', alignItems: 'center',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </SectionCard>
          )}

          {/* ── ALERTES MERCATO ──────────────────────────────────────────── */}
          {(isMobile || activeSection === 'alertes') && (
          <SectionCard>
        <SectionHeader
          title="Alertes mercato"
          subtitle="Recevez des notifications pour les joueurs de votre shortlist"
          badge={<Bell size={14} color="#F5A623" />}
        />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {([
            {
              key:   'transfer' as const,
              icon:  <ArrowLeftRight size={16} />,
              color: '#ef4444',
              label: 'Alertes transfert',
              desc:  'Notifié quand un joueur shortlisté change de club',
            },
            {
              key:   'contract_expiring' as const,
              icon:  <CalendarClock size={16} />,
              color: '#F5A623',
              label: 'Fin de contrat',
              desc:  'Notifié quand un contrat expire dans moins de 6 mois',
            },
          ] as const).map(({ key, icon, color, label, desc }) => {
            const active = alertPrefs[key]
            return (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px',
                  background: active ? `${color}08` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? color + '25' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '12px',
                  transition: 'all 200ms ease',
                }}
              >
                {/* Icon badge */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: active ? `${color}18` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? color + '30' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? color : 'var(--text-muted)',
                  transition: 'all 200ms ease',
                }}>
                  {icon}
                </div>

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {label}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {desc}
                  </p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleAlert(key)}
                  role="switch"
                  aria-checked={active}
                  style={{
                    width: '42px', height: '24px', borderRadius: '12px', flexShrink: 0,
                    border: 'none', cursor: 'pointer', padding: 0,
                    background: active ? color : 'rgba(255,255,255,0.12)',
                    position: 'relative',
                    transition: 'background 200ms ease',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: active ? '21px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'white',
                    transition: 'left 200ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.30)',
                  }} />
                </button>
              </div>
            )
          })}
        </div>
      </SectionCard>
          )}

        </div>{/* end right column */}
      </div>{/* end grid */}

      {/* ── INVITE MODAL ───────────────────────────────────────────────────── */}
      {inviteModalOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setInviteModal(false); setInviteError(null) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.70)',
              backdropFilter: 'blur(4px)',
            }}
          />
          {/* Modal */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 201,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}>
            <div style={{
              width: '100%', maxWidth: '420px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '20px', padding: '28px 28px 24px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Inviter un membre
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Un email d'invitation sera envoyé automatiquement.
                  </p>
                </div>
                <button
                  onClick={() => { setInviteModal(false); setInviteError(null) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '4px', display: 'flex',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {inviteSuccess ? (
                <div style={{
                  padding: '24px', textAlign: 'center',
                  background: 'rgba(0,200,150,0.08)',
                  border: '1px solid rgba(0,200,150,0.25)',
                  borderRadius: '12px',
                }}>
                  <CheckCircle size={28} color="#00C896" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ color: '#00C896', fontWeight: 700, fontSize: '14px', margin: 0 }}>
                    Invitation envoyée !
                  </p>
                </div>
              ) : (
                <>
                  {/* Email */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Adresse email
                    </label>
                    <input
                      type="email"
                      placeholder="scout@club.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: 'var(--text-primary)', fontSize: '13px',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Role */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Rôle
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {ROLE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setInviteRole(opt.value)}
                          style={{
                            flex: 1, padding: '8px 0',
                            borderRadius: '10px',
                            border: `1px solid ${inviteRole === opt.value ? ROLE_COLORS[opt.value] : 'rgba(255,255,255,0.10)'}`,
                            background: inviteRole === opt.value ? ROLE_BG[opt.value] : 'transparent',
                            color: inviteRole === opt.value ? ROLE_COLORS[opt.value] : 'var(--text-muted)',
                            fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 150ms ease',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {inviteError && (
                    <div style={{
                      padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#fca5a5', fontSize: '12px',
                    }}>
                      {inviteError}
                    </div>
                  )}

                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviting}
                    style={{
                      width: '100%', padding: '11px',
                      background: inviteEmail.trim() ? '#4D7FFF' : 'rgba(255,255,255,0.06)',
                      border: 'none', borderRadius: '10px',
                      color: inviteEmail.trim() ? 'white' : 'var(--text-muted)',
                      fontSize: '13px', fontWeight: 700,
                      cursor: inviteEmail.trim() && !inviting ? 'pointer' : 'not-allowed',
                      opacity: inviting ? 0.7 : 1,
                      transition: 'all 150ms ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    }}
                  >
                    <Mail size={13} />
                    {inviting ? 'Envoi…' : 'Envoyer l\'invitation'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
