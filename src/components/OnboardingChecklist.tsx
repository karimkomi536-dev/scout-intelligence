import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, Circle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Checklist {
  profile:   boolean
  player:    boolean
  shortlist: boolean
  pdf:       boolean
}

const DEFAULT_CHECKLIST: Checklist = {
  profile: false, player: false, shortlist: false, pdf: false,
}

// ── Items definition ──────────────────────────────────────────────────────────

interface Item {
  key:    keyof Checklist
  label:  string
  desc:   string
  cta:    string
  href:   string
}

const ITEMS: Item[] = [
  { key: 'profile',   label: 'Profil complété',       desc: 'Votre nom et rôle sont renseignés',     cta: 'Voir Settings →',  href: '/settings' },
  { key: 'player',    label: 'Premier joueur ajouté',  desc: 'Ajoutez un joueur à la base',           cta: 'Voir Joueurs →',   href: '/players' },
  { key: 'shortlist', label: 'Première shortlist',     desc: 'Créez votre première liste de suivi',  cta: 'Voir Shortlist →', href: '/shortlist' },
  { key: 'pdf',       label: 'Rapport PDF exporté',    desc: "Exportez la fiche d'un joueur en PDF", cta: 'Voir un joueur →', href: '/players' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function OnboardingChecklist() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const userId    = user?.id

  // ── ALL hooks declared before any conditional return ─────────────────────────
  const [checklist,     setChecklist]     = useState<Checklist>(DEFAULT_CHECKLIST)
  const [collapsed,     setCollapsed]     = useState(false)
  const [hidden,        setHidden]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // ── Fetch profile + shortlist groups ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return }

    const fetchData = async () => {
      try {
        const [{ data: profile, error: profileError }, { data: groups }] = await Promise.all([
          supabase
            .from('profiles')
            .select('onboarding_checklist, full_name')
            .eq('user_id', userId)
            .single(),
          supabase
            .from('shortlist_groups')
            .select('id')
            .eq('user_id', userId),
        ])

        if (profileError) {
          console.warn('Profile fetch error:', profileError.code)
          return
        }

        if (profile) {
          const stored: Checklist = { ...DEFAULT_CHECKLIST, ...(profile.onboarding_checklist ?? {}) }
          stored.profile   = !!(profile.full_name)
          stored.shortlist = !!(groups && groups.length > 0)
          setChecklist(stored)
          setProfileLoaded(true)
        }
      } catch (e) {
        console.warn('Profile fetch failed:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  // ── Derived values (computed before useEffect that reads them) ────────────────
  const completedCount = Object.values(checklist).filter(Boolean).length
  const total          = ITEMS.length
  const allDone        = completedCount === total

  // ── Auto-hide when all done — must be before any conditional return ───────────
  useEffect(() => {
    if (allDone && profileLoaded) {
      const t = setTimeout(() => setHidden(true), 3000)
      return () => clearTimeout(t)
    }
  }, [allDone, profileLoaded])

  // ── Conditional returns — AFTER all hooks ────────────────────────────────────
  if (loading)              return null
  if (!profileLoaded)       return null
  if (hidden)               return null

  // ── Persist item change to DB ─────────────────────────────────────────────────
  async function updateItem(key: keyof Checklist, value: boolean) {
    if (!userId) return
    const updated = { ...checklist, [key]: value }
    setChecklist(updated)
    await supabase.from('profiles')
      .update({ onboarding_checklist: updated })
      .eq('user_id', userId)
  }

  const pct = Math.round((completedCount / total) * 100)

  return (
    <div style={{
      background:   'rgba(255,255,255,0.03)',
      border:       `1px solid ${allDone ? 'rgba(0,200,150,0.30)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14,
      overflow:     'hidden',
      transition:   'border-color 400ms',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        12,
          padding:    '14px 18px',
          cursor:     'pointer',
          userSelect: 'none',
        }}
      >
        {/* Progress ring */}
        <svg width="32" height="32" style={{ flexShrink: 0 }}>
          <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
          <circle
            cx="16" cy="16" r="13" fill="none"
            stroke={allDone ? '#00C896' : '#4D7FFF'}
            strokeWidth="2.5"
            strokeDasharray={2 * Math.PI * 13}
            strokeDashoffset={2 * Math.PI * 13 * (1 - pct / 100)}
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
          <text x="16" y="20" textAnchor="middle" fill={allDone ? '#00C896' : '#4D7FFF'}
            style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {pct}%
          </text>
        </svg>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {allDone ? 'Onboarding terminé 🎉' : 'Prise en main VIZION'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            {completedCount} / {total} étapes complétées
          </p>
        </div>

        <button
          onClick={e => { e.stopPropagation(); setHidden(true) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.30)', display: 'flex', padding: 4 }}
          title="Masquer définitivement"
        >
          <X size={13} />
        </button>

        {collapsed
          ? <ChevronDown size={15} color="rgba(255,255,255,0.40)" />
          : <ChevronUp   size={15} color="rgba(255,255,255,0.40)" />
        }
      </div>

      {/* Items */}
      {!collapsed && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 0' }}>
          {ITEMS.map(item => {
            const done = checklist[item.key]
            return (
              <div
                key={item.key}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        12,
                  padding:    '10px 18px',
                  opacity:    done ? 0.55 : 1,
                  transition: 'opacity 300ms',
                }}
              >
                <button
                  onClick={() => updateItem(item.key, !done)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? '#00C896' : 'rgba(255,255,255,0.25)', display: 'flex', flexShrink: 0, padding: 0 }}
                >
                  {done ? <CheckCircle size={18} /> : <Circle size={18} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize:       13,
                    fontWeight:     done ? 400 : 600,
                    color:          done ? 'var(--text-muted)' : 'var(--text-primary)',
                    margin:         0,
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                </div>

                {!done && (
                  <button
                    onClick={() => navigate(item.href)}
                    style={{
                      fontSize:     11,
                      fontWeight:   600,
                      color:        '#4D7FFF',
                      background:   'rgba(77,127,255,0.10)',
                      border:       '1px solid rgba(77,127,255,0.20)',
                      borderRadius: 6,
                      padding:      '4px 9px',
                      cursor:       'pointer',
                      whiteSpace:   'nowrap',
                      flexShrink:   0,
                    }}
                  >
                    {item.cta}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
