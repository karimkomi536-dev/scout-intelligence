import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePlayers } from '../hooks/usePlayers'
import { Search, X, Heart, Scale, RotateCcw, Users, SlidersHorizontal } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel, getPosGroup } from '../utils/scoring'
import { useScoringProfile } from '../hooks/useScoringProfile'
import { usePlayerFilters } from '../hooks/usePlayerFilters'
import { useCompare } from '../contexts/CompareContext'
import { useAuth } from '../contexts/AuthContext'
import { usePlan } from '../hooks/usePlan'
import { UpgradeBanner } from '../components/UpgradeBanner'
import { useToast } from '../hooks/useToast'
// ToastContainer is now rendered globally via ToastProvider
import { usePressable } from '../hooks/usePressable'
import { SkeletonCard } from '../components/Skeleton'
import AdvancedSearch from '../components/AdvancedSearch'
import { TrendBadge } from '../components/TrendBadge'
import { ScoreSparkline } from '../components/ScoreSparkline'
import { getTrend } from '../utils/trend'
import { getPercentile } from '../utils/percentile'
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

function getSimulatedScores(score: number): number[] {
  if (score >= 85) return [score - 8, score - 4, score]
  if (score >= 70) return [score - 3, score - 1, score]
  if (score >= 50) return [score, score, score]
  return [score + 5, score + 2, score]
}

function getSimulatedTrend(score: number) {
  return getTrend(getSimulatedScores(score))
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
const FOOT_OPTIONS = [
  { label: 'Gauche',   value: 'Left'  },
  { label: 'Droit',    value: 'Right' },
  { label: 'Les deux', value: ''      },
]

const PAGE_SIZE = 50

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMarketValueShort(eur: number): string {
  if (eur >= 1_000_000_000) return `${(eur / 1_000_000_000).toFixed(1).replace('.0', '')}Md €`
  if (eur >= 1_000_000)     return `${(eur / 1_000_000).toFixed(1).replace('.0', '')}M €`
  if (eur >= 1_000)         return `${Math.round(eur / 1_000)}k €`
  return `${eur} €`
}


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

// ── SwipeableCard ─────────────────────────────────────────────────────────────

function SwipeableCard({
  onSwipeLeft,
  onSwipeRight,
  children,
}: {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  children: React.ReactNode
}) {
  const [offsetX, setOffsetX]     = useState(0)
  const [animating, setAnimating] = useState(false)
  const blockClickRef             = useRef(false)
  const THRESHOLD                 = 68

  const handlers = useSwipeable({
    onSwiping: ({ deltaX, absX }) => {
      setAnimating(false)
      if (absX > 12) blockClickRef.current = true
      setOffsetX(Math.max(-THRESHOLD * 1.4, Math.min(THRESHOLD * 1.4, deltaX)))
    },
    onSwipedLeft: ({ absX }) => {
      setAnimating(true)
      if (absX >= THRESHOLD) {
        setOffsetX(-THRESHOLD * 1.6)
        setTimeout(() => {
          setOffsetX(0)
          onSwipeLeft()
          blockClickRef.current = false
        }, 260)
      } else {
        setOffsetX(0)
        setTimeout(() => { blockClickRef.current = false }, 60)
      }
    },
    onSwipedRight: ({ absX }) => {
      setAnimating(true)
      if (absX >= THRESHOLD) {
        setOffsetX(THRESHOLD * 1.6)
        setTimeout(() => {
          setOffsetX(0)
          onSwipeRight()
          blockClickRef.current = false
        }, 260)
      } else {
        setOffsetX(0)
        setTimeout(() => { blockClickRef.current = false }, 60)
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 12,
  })

  const leftReveal  = Math.max(0, Math.min(1, (-offsetX - 18) / 50))
  const rightReveal = Math.max(0, Math.min(1, (offsetX  - 18) / 50))

  return (
    <div
      {...handlers}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', userSelect: 'none', touchAction: 'pan-y' }}
    >
      {/* Swipe-left background: Dismiss (red) */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '80px',
        background: `rgba(239,68,68,${0.85 * leftReveal})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
        borderRadius: '0 12px 12px 0',
        opacity: leftReveal,
        pointerEvents: 'none',
        transition: animating ? 'opacity 200ms ease' : 'none',
      }}>
        <X size={18} color="white" />
        <span style={{ fontSize: '8px', fontWeight: 700, color: 'white', letterSpacing: '0.07em' }}>IGNORER</span>
      </div>

      {/* Swipe-right background: Shortlist (green) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '80px',
        background: `rgba(0,200,150,${0.85 * rightReveal})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
        borderRadius: '12px 0 0 12px',
        opacity: rightReveal,
        pointerEvents: 'none',
        transition: animating ? 'opacity 200ms ease' : 'none',
      }}>
        <Heart size={18} color="white" fill="white" />
        <span style={{ fontSize: '8px', fontWeight: 700, color: 'white', letterSpacing: '0.07em' }}>SHORTLIST</span>
      </div>

      {/* Translating card */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: animating ? 'transform 260ms cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          willChange: 'transform',
        }}
        onClick={e => { if (blockClickRef.current) e.stopPropagation() }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Players page ──────────────────────────────────────────────────────────────

// ── MobilePlayerCard ──────────────────────────────────────────────────────────
// Extracted so it can use hooks (usePressable) — can't call hooks inside .map()

function MobilePlayerCard({
  player, label, meta, grad, inComp, percentile,
  onDismiss, onShortlist, onNavigate,
}: {
  player: Player & { _score: number }
  label: string
  meta: { color: string; glow: string }
  grad: string
  inComp: boolean
  percentile?: number
  onDismiss: () => void
  onShortlist: () => void
  onNavigate: () => void
}) {
  const cardPress  = usePressable()
  const shortPress = usePressable()

  const initials = player.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <SwipeableCard
      onSwipeLeft={onDismiss}
      onSwipeRight={onShortlist}
    >
      <div
        onClick={onNavigate}
        {...cardPress.handlers}
        style={{
          ...cardPress.style,
          display: 'flex',
          flexDirection: 'column',
          background: '#0D1525',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '14px 16px',
          cursor: 'pointer',
        }}
      >
        {/* Row 1: avatar + name + label badge + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, color: 'white',
          }}>
            {initials}
          </div>

          {/* Name + club + position */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.name}
              </p>
              <span style={{
                flexShrink: 0,
                fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700,
                color: meta.color, background: `${meta.color}12`,
                border: `1px solid ${meta.color}28`, borderRadius: '4px',
                padding: '1px 5px', letterSpacing: '0.06em',
              }}>
                {label}
              </span>
              <TrendBadge trend={getSimulatedTrend(player._score)} size="sm" />
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
              {player.team}
              {player.primary_position ? ` · ${player.primary_position}` : ''}
              {player.age ? ` · ${player.age} ans` : ''}
            </p>
          </div>

          {/* Score ring */}
          <div
            style={{ flexShrink: 0 }}
            onClick={e => e.stopPropagation()}
            title={percentile != null ? `Top ${percentile}% des ${player.primary_position}` : undefined}
          >
            <svg width="36" height="36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="14" fill="none"
                stroke={meta.color} strokeWidth="2.5"
                strokeDasharray={String(2 * Math.PI * 14)}
                strokeDashoffset={String(2 * Math.PI * 14 * (1 - player._score / 100))}
                strokeLinecap="round" transform="rotate(-90 18 18)"
                style={{ filter: `drop-shadow(0 0 3px ${meta.color})` }}
              />
              <text x="18" y="22" textAnchor="middle" fill={meta.color}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 600 }}>
                {player._score}
              </text>
            </svg>
          </div>
        </div>

        {/* Row 2: score bar + sparkline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0 8px' }}>
          <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${player._score}%`,
              background: meta.color,
              borderRadius: '2px',
              boxShadow: `0 0 6px ${meta.color}80`,
            }} />
          </div>
          <ScoreSparkline scores={getSimulatedScores(player._score)} width={48} height={20} />
        </div>

        {/* Row 3: shortlist button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
          <button
            {...shortPress.handlers}
            onClick={onShortlist}
            style={{
              ...shortPress.style,
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px',
              background: 'rgba(0,200,150,0.08)',
              border: '1px solid rgba(0,200,150,0.22)',
              borderRadius: '8px',
              color: '#00C896',
              fontSize: '11px', fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            <Heart size={11} fill="#00C896" />
            Shortlist
          </button>

          {inComp && (
            <span style={{
              marginLeft: '6px',
              alignSelf: 'center',
              fontSize: '8px', fontWeight: 700, color: '#4D7FFF',
              background: 'rgba(77,127,255,0.15)',
              border: '1px solid rgba(77,127,255,0.35)',
              borderRadius: '4px', padding: '1px 5px',
            }}>
              COMP.
            </span>
          )}
        </div>
      </div>
    </SwipeableCard>
  )
}

// ── Players page ──────────────────────────────────────────────────────────────

export default function Players() {
  const navigate = useNavigate()
  const { filters, set, reset, hasActiveFilters, activeFilterCount, serialize, restore } = usePlayerFilters()
  const { isSelected, toggle, ids: compareIds } = useCompare()
  const isMobile = useIsMobile()
  const { weights: scoringWeights } = useScoringProfile()
  const { user } = useAuth()
  const { limits } = usePlan()
  const { showToast } = useToast()

  const queryClient = useQueryClient()
  const [totalPlayerCount, setTotalPlayerCount] = useState(0)
  const [leagues, setLeagues]   = useState<string[]>([])
  const [page, setPage]         = useState(1)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showFiltersDrawer, setShowFiltersDrawer]       = useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch]     = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Pull-to-refresh
  const pullStartY  = useRef(0)
  const [pullY, setPullY]               = useState(0)
  const [isPullRefreshing, setIsPullRefreshing] = useState(false)

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
    supabase.from('players').select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalPlayerCount(count ?? 0))
  }, [])

  // ── TanStack Query — cached player fetch ──────────────────────────────────
  const queryFilters = {
    search:      debouncedSearch,
    positions:   filters.positions,
    leagues:     filters.leagues,
    nationality: filters.nationality,
    ageMin:      filters.ageMin,
    ageMax:      filters.ageMax,
    foot:        filters.foot,
    minScore:    filters.minScore,
    maxValueM:   filters.maxValueM,
    xgMin:       filters.xgMin,
    minutesMin:  filters.minutesMin,
    labels:      filters.labels,
  }
  const { data: players = [], isLoading: loading } = usePlayers(queryFilters)

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [debouncedSearch, filters.positions.join(','), filters.leagues.join(','),
   filters.labels.join(','), filters.ageMin, filters.ageMax, filters.foot,
   filters.minScore, filters.maxValueM, filters.xgMin, filters.minutesMin])

  function toggleValue(list: string[], value: string) {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value]
  }

  // ── Quick-add to shortlist (mobile card button) ────────────────────────────
  async function handleQuickShortlist(player: Player) {
    if (!user) return
    try {
      // Find or create first group
      const { data: groups } = await supabase
        .from('shortlist_groups')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at')
        .limit(1)
      let listId = groups?.[0]?.id
      if (!listId) {
        const { data: newGroup } = await supabase
          .from('shortlist_groups')
          .insert({ user_id: user.id, name: 'Ma shortlist' })
          .select('id')
          .single()
        listId = newGroup?.id
      }
      if (!listId) throw new Error('Impossible de créer la shortlist')
      await supabase.from('shortlists').insert({
        user_id: user.id, player_id: player.id,
        list_id: listId, tags: [], position_index: 0,
      })
      showToast('✓ Ajouté à la shortlist', 'success')
    } catch {
      showToast('Joueur déjà dans la shortlist', 'info')
    }
  }

  // ── Pull-to-refresh handlers ───────────────────────────────────────────────
  function onPullTouchStart(e: React.TouchEvent) {
    const main = document.querySelector('main')
    if (main && main.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY
    } else {
      pullStartY.current = -1
    }
  }

  function onPullTouchMove(e: React.TouchEvent) {
    if (pullStartY.current < 0) return
    const delta = e.touches[0].clientY - pullStartY.current
    if (delta > 0) setPullY(Math.min(delta, 90))
  }

  function onPullTouchEnd() {
    if (pullY > 60 && !isPullRefreshing) {
      setIsPullRefreshing(true)
      setDismissed(new Set())
      queryClient.invalidateQueries({ queryKey: ['players'] })
      setTimeout(() => setIsPullRefreshing(false), 800)
    }
    setPullY(0)
    pullStartY.current = -1
  }

  const scored: PlayerWithScore[] = players.map(p => ({
    ...p,
    _score: calculateScore(p, scoringWeights[getPosGroup(p.primary_position)]),
  }))

  const scoresByPosition = useMemo(() => {
    const map: Record<string, number[]> = {}
    scored.forEach(p => {
      const pos = p.primary_position || 'MID'
      if (!map[pos]) map[pos] = []
      map[pos].push(p._score)
    })
    return map
  }, [scored])

  const visible    = scored.filter(p => {
    if (dismissed.has(p.id)) return false
    if (filters.trends.length > 0) {
      const t = getSimulatedTrend(p._score)
      if (!filters.trends.includes(t.type)) return false
    }
    return true
  })
  const totalPages = Math.ceil(visible.length / PAGE_SIZE)
  const paginated  = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Shared filter content (used in desktop panel & mobile drawer) ────────────

  const filterContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

      {/* Valeur max */}
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '7px' }}>Valeur max</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input type="number" min={0} step={1} value={filters.maxValueM || ''}
            placeholder="∞"
            onChange={e => set({ maxValueM: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-primary)', borderRadius: '6px', padding: '4px 6px',
              width: '60px', fontSize: '12px', textAlign: 'center', outline: 'none',
              fontFamily: 'var(--font-mono)',
            }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>M €</span>
          {filters.maxValueM > 0 && (
            <button onClick={() => set({ maxValueM: 0 })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>✕</button>
          )}
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

      {/* Reset */}
      {hasActiveFilters && (
        <button onClick={reset} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          background: 'none', border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '8px', color: 'var(--text-muted)',
          fontSize: '12px', padding: '8px', cursor: 'pointer', width: '100%',
        }}>
          <RotateCcw size={12} /> Réinitialiser les filtres
        </button>
      )}
    </div>
  )

  // ── Empty / loading state ─────────────────────────────────────────────────

  const emptyState = (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <Users size={36} color="rgba(255,255,255,0.08)" />
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Aucun joueur ne correspond à ces filtres.</p>
      {hasActiveFilters && (
        <button onClick={reset} style={{ color: '#4D7FFF', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )

  // ── Pagination ────────────────────────────────────────────────────────────

  const paginationStart = Math.min((page - 1) * PAGE_SIZE + 1, visible.length)
  const paginationEnd   = Math.min(page * PAGE_SIZE, visible.length)

  const pagination = !loading && visible.length > 0 && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
      {/* Count */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
        Affichage {paginationStart}–{paginationEnd} sur {visible.length} joueur{visible.length > 1 ? 's' : ''}
      </p>

      {/* Page buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          {/* Previous */}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: page === 1 ? 'rgba(255,255,255,0.18)' : 'var(--text-muted)',
              cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            ← Précédent
          </button>

          {/* Smart page numbers */}
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '0 4px' }}>…</span>
            ) : (
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
            )
          )}

          {/* Next */}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: page === totalPages ? 'rgba(255,255,255,0.18)' : 'var(--text-muted)',
              cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )

  // ── Search bar (shared) ───────────────────────────────────────────────────

  const searchBar = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px', padding: '9px 14px',
    }}>
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
  )

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ─────────────────────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div
        style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}
        onTouchStart={onPullTouchStart}
        onTouchMove={onPullTouchMove}
        onTouchEnd={onPullTouchEnd}
      >

        {/* Pull-to-refresh indicator */}
        {(pullY > 0 || isPullRefreshing) && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: Math.max(pullY, isPullRefreshing ? 40 : 0),
            overflow: 'hidden', transition: isPullRefreshing ? 'none' : 'height 100ms',
          }}>
            <div style={{
              width: 24, height: 24,
              border: '2px solid rgba(0,200,150,0.2)',
              borderTopColor: '#00C896',
              borderRadius: '50%',
              animation: isPullRefreshing ? 'spin 0.8s linear infinite' : undefined,
              opacity: pullY > 60 || isPullRefreshing ? 1 : pullY / 60,
              transition: 'opacity 100ms',
            }} />
          </div>
        )}

        {/* Sticky search + filter row */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-base)',
          paddingBottom: '8px',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <div style={{ flex: 1 }}>{searchBar}</div>
          <button
            onClick={() => setShowAdvancedSearch(true)}
            style={{
              display: 'flex', alignItems: 'center',
              background: activeFilterCount > 0 ? 'rgba(77,127,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(77,127,255,0.40)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px', color: activeFilterCount > 0 ? '#4D7FFF' : 'var(--text-muted)',
              fontSize: '13px', padding: '9px 12px', cursor: 'pointer', flexShrink: 0,
              position: 'relative',
            }}
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#4D7FFF', color: 'white',
                fontSize: '9px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--bg-base)',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowFiltersDrawer(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: activeFilterCount > 0 ? 'rgba(77,127,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(77,127,255,0.40)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px',
              color: activeFilterCount > 0 ? '#4D7FFF' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: 600, padding: '9px 12px',
              cursor: 'pointer', flexShrink: 0, position: 'relative',
            }}
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#4D7FFF', color: 'white',
                fontSize: '9px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--bg-base)',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Result count */}
        {!loading && (
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {visible.length} joueur{visible.length !== 1 ? 's' : ''} trouvé{visible.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Nationality badge (mobile) */}
        {filters.nationality && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.30)',
            borderRadius: '20px', padding: '4px 10px 4px 12px',
            fontSize: '12px', fontWeight: 600, color: '#00C896', alignSelf: 'flex-start',
          }}>
            <span>Pays : {filters.nationality} ({scored.length})</span>
            <button
              onClick={() => set({ nationality: '' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00C896', display: 'flex', padding: '0 2px' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Plan limit banner */}
        {totalPlayerCount >= limits.maxPlayers && (
          <UpgradeBanner feature="limite joueurs" />
        )}

        {/* Cards */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : visible.length === 0 ? emptyState : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paginated.map(player => {
              const label = getScoreLabel(player._score)
              const meta  = LABEL_META[label] ?? LABEL_META['LOW PRIORITY']
              const grad  = POS_GRADIENTS[player.primary_position] ?? 'linear-gradient(135deg,#4A5A70,#2E3D52)'
              const posScores = scoresByPosition[player.primary_position] ?? []
              const pct = getPercentile(player._score, posScores)
              return (
                <MobilePlayerCard
                  key={player.id}
                  player={player}
                  label={label}
                  meta={meta}
                  grad={grad}
                  inComp={isSelected(player.id)}
                  percentile={pct}
                  onDismiss={() => {
                    setDismissed(prev => new Set([...prev, player.id]))
                    showToast('Joueur retiré de la vue', 'info')
                  }}
                  onShortlist={() => handleQuickShortlist(player)}
                  onNavigate={() => navigate(`/players/${player.id}`)}
                />
              )
            })}
          </div>
        )}

        {pagination}

        <AdvancedSearch
          open={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          filters={filters}
          leagues={leagues}
          activeFilterCount={activeFilterCount}
          onSet={set}
          onReset={reset}
          onSave={_name => setShowAdvancedSearch(false)}
          onRestore={restore}
          serialize={serialize}
        />

        {/* Filter drawer (bottom sheet) */}
        {showFiltersDrawer && (
          <>
            <div
              onClick={() => setShowFiltersDrawer(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90 }}
            />
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 91,
              background: '#0D1525',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px 20px 0 0',
              padding: '0 20px 32px',
              maxHeight: '82vh',
              overflowY: 'auto',
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingTop: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Filtres</span>
                <button
                  onClick={() => setShowFiltersDrawer(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
              {filterContent}
              <button
                onClick={() => setShowFiltersDrawer(false)}
                style={{
                  marginTop: '20px', width: '100%',
                  background: 'var(--accent-blue)', border: 'none',
                  borderRadius: '10px', color: 'white',
                  fontSize: '14px', fontWeight: 600, padding: '13px',
                  cursor: 'pointer',
                }}
              >
                Voir les résultats
                {!loading && ` (${visible.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ─────────────────────────────────────────────────────────────────────────

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

      {/* Nationality filter badge */}
      {filters.nationality && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.30)',
            borderRadius: '20px', padding: '4px 10px 4px 12px',
            fontSize: '12px', fontWeight: 600, color: '#00C896',
          }}>
            <span>Pays : {filters.nationality}</span>
            {!loading && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', opacity: 0.7 }}>
                ({scored.length})
              </span>
            )}
            <button
              onClick={() => set({ nationality: '' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00C896', display: 'flex', padding: '0 2px', lineHeight: 1 }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Plan limit banner */}
      {totalPlayerCount >= limits.maxPlayers && (
        <UpgradeBanner feature="limite joueurs" />
      )}

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>{searchBar}</div>
          <button
            onClick={() => setShowAdvancedSearch(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              background: activeFilterCount > 0 ? 'rgba(77,127,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(77,127,255,0.40)' : 'rgba(255,255,255,0.10)'}`,
              borderRadius: '8px', padding: '9px 14px',
              color: activeFilterCount > 0 ? '#4D7FFF' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              position: 'relative',
            }}
          >
            <SlidersHorizontal size={14} />
            Recherche avancée
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: '-7px', right: '-7px',
                width: '17px', height: '17px', borderRadius: '50%',
                background: '#4D7FFF', color: 'white',
                fontSize: '9px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--bg-base)',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
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
          {/* Valeur max */}
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '7px' }}>Valeur max</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="number" min={0} step={1} value={filters.maxValueM || ''}
                placeholder="∞"
                onChange={e => set({ maxValueM: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-primary)', borderRadius: '6px', padding: '4px 6px',
                  width: '60px', fontSize: '12px', textAlign: 'center', outline: 'none',
                  fontFamily: 'var(--font-mono)',
                }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>M €</span>
              {filters.maxValueM > 0 && (
                <button onClick={() => set({ maxValueM: 0 })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>✕</button>
              )}
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
      ) : visible.length === 0 ? emptyState : (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 90px 80px 100px 120px 1fr 90px 72px',
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}>
            {['', 'JOUEUR', 'POSTE', 'ÂGE', 'SCORE', 'LABEL', 'CHAMPIONNAT', 'VALEUR', ''].map((h, i) => (
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
                  gridTemplateColumns: '48px 1fr 90px 80px 100px 120px 1fr 90px 72px',
                  alignItems: 'center',
                  padding: '0 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  position: 'relative',
                  background: isHov ? 'rgba(255,255,255,0.025)' : 'transparent',
                  transition: 'background 120ms ease',
                  boxShadow: isHov ? 'inset 2px 0 0 #4D7FFF' : 'none',
                }}
              >
                <div style={{ padding: '12px 0' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: grad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: 'white',
                    boxShadow: isHov ? `0 0 12px rgba(255,255,255,0.15)` : 'none',
                    transition: 'box-shadow 150ms',
                  }}>
                    {initials}
                  </div>
                </div>
                <div style={{ padding: '12px 8px', minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.team}
                  </p>
                </div>
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
                <div style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {player.age ?? '—'}
                </div>
                <div
                  style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title={`Top ${getPercentile(player._score, scoresByPosition[player.primary_position] ?? [])}% des ${player.primary_position}`}
                >
                  <ScoreRing score={player._score} color={meta.color} />
                  <ScoreSparkline scores={getSimulatedScores(player._score)} width={40} height={18} />
                </div>
                <div style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600,
                    color: meta.color, background: `${meta.color}12`,
                    border: `1px solid ${meta.color}28`,
                    borderRadius: '5px', padding: '2px 7px',
                    boxShadow: '0 0 8px ' + meta.glow,
                    transition: 'box-shadow 150ms',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                  <TrendBadge trend={getSimulatedTrend(player._score)} size="sm" />
                </div>
                <div style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.competition}
                </div>
                <div style={{ padding: '12px 8px' }}>
                  {player.market_value_eur != null ? (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600,
                      color: '#F5A623',
                    }}>
                      {formatMarketValueShort(player.market_value_eur)}
                    </span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>—</span>
                  )}
                </div>
                <div />
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', right: 12,
                    top: '50%', transform: 'translateY(-50%)',
                    display: isHov ? 'flex' : 'none',
                    gap: 6, alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => handleQuickShortlist(player)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.35)',
                      color: '#00C896', cursor: 'pointer',
                    }}
                  >
                    <Heart size={10} fill="#00C896" /> + Shortlist
                  </button>
                  <button
                    onClick={() => {
                      if (compareIds.length < 3 || inComp) {
                        if (!inComp) showToast('Joueur ajouté au comparateur', 'success')
                        toggle(player.id)
                      }
                    }}
                    disabled={compareIds.length >= 3 && !inComp}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      background: inComp ? 'rgba(77,127,255,0.18)' : 'rgba(77,127,255,0.10)',
                      border: `1px solid ${inComp ? 'rgba(77,127,255,0.5)' : 'rgba(77,127,255,0.30)'}`,
                      color: '#4D7FFF',
                      cursor: compareIds.length >= 3 && !inComp ? 'not-allowed' : 'pointer',
                      opacity: compareIds.length >= 3 && !inComp ? 0.4 : 1,
                    }}
                  >
                    <Scale size={10} /> Comparer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pagination}

      <AdvancedSearch
        open={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        filters={filters}
        leagues={leagues}
        activeFilterCount={activeFilterCount}
        onSet={set}
        onReset={reset}
        onSave={_name => setShowAdvancedSearch(false)}
        onRestore={restore}
        serialize={serialize}
      />
    </div>
  )
}
