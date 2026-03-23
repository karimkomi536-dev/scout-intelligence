import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Heart, Scale, RotateCcw, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import { usePlayerFilters } from '../hooks/usePlayerFilters'
import { useCompare } from '../contexts/CompareContext'
import type { Player } from '../types/player'

// ── Constants ─────────────────────────────────────────────────────────────────

type PlayerWithScore = Player & { _score: number }

const LABEL_META: Record<string, { color: string; glow: string }> = {
  'ELITE':        { color: '#00C896', glow: 'rgba(0,200,150,0.25)'   },
  'TOP PROSPECT': { color: '#4D7FFF', glow: 'rgba(77,127,255,0.25)'  },
  'INTERESTING':  { color: '#F5A623', glow: 'rgba(245,166,35,0.20)'  },
  'TO MONITOR':   { color: '#9B6DFF', glow: 'rgba(155,109,255,0.20)' },
  'LOW PRIORITY': { color: '#4A5A70', glow: 'rgba(74,90,112,0.15)'   },
}

const POS_GRADIENTS: Record<string, string> = {
  GK:  'linear-gradient(135deg,#F5A623,#f97316)',
  CB:  'linear-gradient(135deg,#00C896,#22D4E8)',
  LB:  'linear-gradient(135deg,#00C896,#22D4E8)',
  RB:  'linear-gradient(135deg,#00C896,#22D4E8)',
  CDM: 'linear-gradient(135deg,#4D7FFF,#22D4E8)',
  CM:  'linear-gradient(135deg,#4D7FFF,#22D4E8)',
  CAM: 'linear-gradient(135deg,#4D7FFF,#9B6DFF)',
  LW:  'linear-gradient(135deg,#ef4444,#F5A623)',
  RW:  'linear-gradient(135deg,#ef4444,#F5A623)',
  ST:  'linear-gradient(135deg,#ef4444,#9B6DFF)',
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
const FOOT_OPTIONS = [
  { label: 'Gauche',   value: 'Left'  },
  { label: 'Droit',    value: 'Right' },
  { label: 'Les deux', value: ''      },
]

const PAGE_SIZE = 20

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 14, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="36" height="36" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <circle cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      <text x="18" y="22" textAnchor="middle" fill={color}
        style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 600 }}>
        {score}
      </text>
    </svg>
  )
}

function Pill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(77,127,255,0.18)' : 'transparent',
      color: active ? '#4D7FFF' : 'var(--text-muted)',
      border: `1px solid ${active ? '#4D7FFF' : 'rgba(255,255,255,0.10)'}`,
      borderRadius: '20px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      transition: 'all 150ms ease',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  )
}

// ── Players page ──────────────────────────────────────────────────────────────

export default function Players() {
  const navigate = useNavigate()
  const { filters, set, reset, hasActiveFilters } = usePlayerFilters()
  const { isSelected, toggle, ids: compareIds } = useCompare()

  const [players, setPlayers]   = useState<Player[]>([])
  const [loading, setLoading]   = useState(true)
  const [leagues, setLeagues]   = useState<string[]>([])
  const [page, setPage]         = useState(1)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  useEffect(() => {
    supabase.from('players').select('competition').then(({ data }) => {
      const unique = [...new Set(
        (data ?? []).map(d => d.competition as string).filter(Boolean)
      )].sort()
      setLeagues(unique)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from('players').select('*')
    if (debouncedSearch)           q = q.ilike('name', `%${debouncedSearch}%`)
    if (filters.positions.length)  q = q.in('primary_position', filters.positions)
    if (filters.leagues.length)    q = q.in('competition', filters.leagues)
    if (filters.ageMin > 16)       q = q.gte('age', filters.ageMin)
    if (filters.ageMax < 40)       q = q.lte('age', filters.ageMax)
    if (filters.foot === 'Left')   q = q.ilike('foot', '%left%')
    if (filters.foot === 'Right')  q = q.ilike('foot', '%right%')
    if (filters.minScore > 0)      q = q.gte('scout_score', filters.minScore)
    q.order('scout_score', { ascending: false })
      .then(({ data }: { data: Player[] | null }) => {
        setPlayers(data ?? [])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.positions.join(','), filters.leagues.join(','),
      filters.ageMin, filters.ageMax, filters.foot, filters.minScore])

  function toggleValue(list: string[], value: string) {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value]
  }

  const scored: PlayerWithScore[] = players.map(p => ({ ...p, _score: calculateScore(p) }))
  const totalPages = Math.ceil(scored.length / PAGE_SIZE)
  const paginated  = scored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Joueurs</h2>
          {!loading && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600,
              color: '#4D7FFF', background: 'rgba(77,127,255,0.12)',
              border: '1px solid rgba(77,127,255,0.25)', borderRadius: '6px',
              padding: '2px 8px',
            }}>
              {scored.length} trouvé{scored.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button onClick={reset} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'none', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '8px', color: 'var(--text-muted)',
            fontSize: '12px', padding: '6px 12px', cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        )}
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: '12px', padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', padding: '9px 14px',
          transition: 'border-color 150ms',
        }}
        onFocus={() => {}} // handled by input focus
        >
          <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Rechercher un joueur ou une équipe…"
            value={filters.search}
            onChange={e => set({ search: e.target.value })}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '13px', flex: 1,
            }}
          />
          {filters.search && (
            <button onClick={() => set({ search: '' })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Positions */}
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '7px' }}>Poste</p>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {POSITIONS.map(p => (
                <Pill key={p} active={filters.positions.includes(p)} onClick={() => set({ positions: toggleValue(filters.positions, p) })}>
                  {p}
                </Pill>
              ))}
            </div>
          </div>

          {/* Foot */}
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '7px' }}>Pied</p>
            <div style={{ display: 'flex', gap: '4px' }}>
              {FOOT_OPTIONS.map(({ label, value }) => (
                <Pill key={label} active={filters.foot === value && (value !== '' || filters.foot === '')}
                  onClick={() => set({ foot: filters.foot === value && value !== '' ? '' : value })}>
                  {label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '7px' }}>Âge</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[
                { val: filters.ageMin, key: 'ageMin' as const, min: 16, max: filters.ageMax },
                { val: filters.ageMax, key: 'ageMax' as const, min: filters.ageMin, max: 40 },
              ].map(({ val, key, min, max }, i) => (
                <>
                  {i === 1 && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>–</span>}
                  <input key={key} type="number" min={min} max={max} value={val}
                    onChange={e => set({ [key]: Math.min(max, Math.max(min, Number(e.target.value))) })}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-primary)', borderRadius: '6px', padding: '4px 6px',
                      width: '50px', fontSize: '12px', textAlign: 'center', outline: 'none',
                      fontFamily: 'var(--font-mono)',
                    }} />
                </>
              ))}
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>ans</span>
            </div>
          </div>

          {/* Score min */}
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '7px' }}>Score min</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="range" min={0} max={100} value={filters.minScore}
                onChange={e => set({ minScore: Number(e.target.value) })}
                style={{ accentColor: '#4D7FFF', width: '90px' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: '#4D7FFF', minWidth: '24px' }}>{filters.minScore}</span>
            </div>
          </div>
        </div>

        {/* Leagues */}
        {leagues.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '7px' }}>Championnat</p>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {leagues.map(l => (
                <Pill key={l} active={filters.leagues.includes(l)} onClick={() => set({ leagues: toggleValue(filters.leagues, l) })}>
                  {l}
                </Pill>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          Chargement…
        </div>
      ) : scored.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Users size={40} color="rgba(255,255,255,0.08)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Aucun joueur ne correspond à ces filtres.</p>
          {hasActiveFilters && (
            <button onClick={reset} style={{ color: '#4D7FFF', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 90px 80px 100px 120px 1fr 72px',
            gap: '0',
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 16px',
          }}>
            {['', 'JOUEUR', 'POSTE', 'ÂGE', 'SCORE', 'LABEL', 'CHAMPIONNAT', ''].map((h, i) => (
              <div key={i} style={{
                padding: '10px 8px',
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                color: 'var(--text-muted)', letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {paginated.map(player => {
            const label   = getScoreLabel(player._score)
            const meta    = LABEL_META[label] ?? LABEL_META['LOW PRIORITY']
            const grad    = POS_GRADIENTS[player.primary_position] ?? 'linear-gradient(135deg,#4A5A70,#2E3D52)'
            const initials = player.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            const isHov  = hoveredId === player.id
            const inComp = isSelected(player.id)

            return (
              <div key={player.id}
                onClick={() => navigate(`/players/${player.id}`)}
                onMouseEnter={() => setHoveredId(player.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 90px 80px 100px 120px 1fr 72px',
                  alignItems: 'center',
                  gap: '0',
                  padding: '0 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  background: isHov ? 'rgba(255,255,255,0.025)' : 'transparent',
                  transition: 'background 120ms ease',
                  boxShadow: isHov ? 'inset 2px 0 0 #4D7FFF' : 'none',
                }}
              >
                {/* Avatar */}
                <div style={{ padding: '12px 0' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: grad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: 'white',
                    boxShadow: isHov ? `0 0 12px rgba(255,255,255,0.15)` : 'none',
                    transition: 'box-shadow 150ms',
                  }}>
                    {initials}
                  </div>
                </div>

                {/* Name + team */}
                <div style={{ padding: '12px 8px', minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.team}
                  </p>
                </div>

                {/* Position badge */}
                <div style={{ padding: '12px 8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600,
                    color: meta.color, background: `${meta.color}15`,
                    border: `1px solid ${meta.color}30`,
                    borderRadius: '5px', padding: '2px 7px',
                  }}>
                    {player.primary_position}
                  </span>
                </div>

                {/* Age */}
                <div style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {player.age ?? '—'}
                </div>

                {/* Score ring */}
                <div style={{ padding: '12px 8px' }}>
                  <ScoreRing score={player._score} color={meta.color} />
                </div>

                {/* Label badge */}
                <div style={{ padding: '12px 8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600,
                    color: meta.color, background: `${meta.color}12`,
                    border: `1px solid ${meta.color}28`,
                    borderRadius: '5px', padding: '2px 7px',
                    boxShadow: isHov ? `0 0 8px ${meta.glow}` : 'none',
                    transition: 'box-shadow 150ms',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>

                {/* League */}
                <div style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.competition}
                </div>

                {/* Actions */}
                <div style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '6px', opacity: isHov ? 1 : 0, transition: 'opacity 150ms' }}
                  onClick={e => e.stopPropagation()}>
                  <button
                    title={inComp ? 'Retirer du comparateur' : compareIds.length >= 3 ? 'Max 3' : 'Comparer'}
                    onClick={() => (compareIds.length < 3 || inComp) && toggle(player.id)}
                    style={{
                      width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: inComp ? 'rgba(77,127,255,0.18)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${inComp ? 'rgba(77,127,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: inComp ? '#4D7FFF' : 'var(--text-muted)',
                      cursor: compareIds.length >= 3 && !inComp ? 'not-allowed' : 'pointer',
                      opacity: compareIds.length >= 3 && !inComp ? 0.4 : 1,
                    }}>
                    <Scale size={12} />
                  </button>
                  <button
                    title="Ajouter à la shortlist"
                    onClick={() => navigate('/shortlist')}
                    style={{
                      width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#00C896'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  >
                    <Heart size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', paddingTop: '4px' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              width: 30, height: 30, borderRadius: '6px',
              background: p === page ? 'rgba(77,127,255,0.18)' : 'transparent',
              border: `1px solid ${p === page ? '#4D7FFF' : 'rgba(255,255,255,0.08)'}`,
              color: p === page ? '#4D7FFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: p === page ? 600 : 400,
              cursor: 'pointer', transition: 'all 150ms',
            }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
