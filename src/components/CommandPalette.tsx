import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutDashboard, Bookmark, Users, ArrowRight, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getScoreLabel } from '../utils/scoring'
import type { Player } from '../types/player'

// ── CSS animation injected once ───────────────────────────────────────────────

const PALETTE_STYLE = `
@keyframes paletteIn {
  from { opacity: 0; transform: scale(0.95) translateY(-8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}
.command-palette-modal {
  animation: paletteIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}
`

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShortlistGroup {
  id: string
  name: string
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  to: string
}

type ResultItem =
  | { kind: 'player';   data: Player }
  | { kind: 'shortlist'; data: ShortlistGroup }
  | { kind: 'action';   data: QuickAction }

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-dashboard', label: 'Aller au Dashboard',   icon: <LayoutDashboard size={14} />, to: '/dashboard' },
  { id: 'qa-players',   label: 'Voir tous les joueurs', icon: <Users           size={14} />, to: '/players'   },
  { id: 'qa-shortlist', label: 'Voir la shortlist',     icon: <Bookmark        size={14} />, to: '/shortlist' },
]

const LABEL_COLOR: Record<string, string> = {
  'ELITE':        '#00C896',
  'TOP PROSPECT': '#4D7FFF',
  'INTERESTING':  '#F5A623',
  'TO MONITOR':   '#9B6DFF',
  'LOW PRIORITY': '#4A5A70',
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#4D7FFF,#22D4E8)',
  'linear-gradient(135deg,#00C896,#22D4E8)',
  'linear-gradient(135deg,#9B6DFF,#4D7FFF)',
  'linear-gradient(135deg,#F5A623,#ef4444)',
  'linear-gradient(135deg,#ec4899,#9B6DFF)',
]
function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function CommandPalette({ onClose }: Props) {
  const navigate = useNavigate()
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)

  const [query,      setQuery]      = useState('')
  const [players,    setPlayers]    = useState<Player[]>([])
  const [groups,     setGroups]     = useState<ShortlistGroup[]>([])
  const [loading,    setLoading]    = useState(false)
  const [activeIdx,  setActiveIdx]  = useState(0)

  // Inject animation CSS once
  useEffect(() => {
    if (!document.getElementById('cmd-palette-styles')) {
      const style = document.createElement('style')
      style.id = 'cmd-palette-styles'
      style.textContent = PALETTE_STYLE
      document.head.appendChild(style)
    }
  }, [])

  // Auto-focus
  useEffect(() => { inputRef.current?.focus() }, [])

  // ── Debounced search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!query.trim()) {
      setPlayers([])
      setGroups([])
      setActiveIdx(0)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const q = `%${query.trim()}%`
      const [pRes, gRes] = await Promise.all([
        supabase
          .from('players')
          .select('id,name,primary_position,scout_score,scout_label,individual_stats')
          .ilike('name', q)
          .order('scout_score', { ascending: false })
          .limit(6),
        supabase
          .from('shortlist_groups')
          .select('id,name')
          .ilike('name', q)
          .limit(4),
      ])
      setPlayers((pRes.data ?? []) as Player[])
      setGroups((gRes.data ?? []) as ShortlistGroup[])
      setActiveIdx(0)
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  // ── Flatten items for keyboard nav ─────────────────────────────────────────

  const items: ResultItem[] = [
    ...players.map(p  => ({ kind: 'player'    as const, data: p  })),
    ...groups.map(g   => ({ kind: 'shortlist' as const, data: g  })),
    ...(!query.trim() ? QUICK_ACTIONS : QUICK_ACTIONS.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()))
    ).map(a => ({ kind: 'action' as const, data: a })),
  ]

  // ── Navigate to item ───────────────────────────────────────────────────────

  const selectItem = useCallback((item: ResultItem) => {
    if (item.kind === 'player')    navigate(`/players/${item.data.id}`)
    if (item.kind === 'shortlist') navigate('/shortlist')
    if (item.kind === 'action')    navigate(item.data.to)
    onClose()
  }, [navigate, onClose])

  // ── Keyboard handler ────────────────────────────────────────────────────────

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, items.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && items[activeIdx]) {
      e.preventDefault()
      selectItem(items[activeIdx])
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // ── Sections ───────────────────────────────────────────────────────────────

  let globalIdx = 0

  function renderSection(label: string, content: React.ReactNode, show: boolean) {
    if (!show) return null
    return (
      <div>
        <p style={{
          fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '10px 16px 4px', margin: 0,
          fontFamily: 'var(--font-mono)',
        }}>
          {label}
        </p>
        {content}
      </div>
    )
  }

  const playerItems = players.map(p => {
    const idx   = globalIdx++
    const label = getScoreLabel(p.scout_score)
    const color = LABEL_COLOR[label] ?? '#4A5A70'
    const isAct = idx === activeIdx
    return (
      <button
        key={p.id}
        data-idx={idx}
        onClick={() => selectItem({ kind: 'player', data: p })}
        onMouseEnter={() => setActiveIdx(idx)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          width: '100%', padding: '9px 16px',
          background: isAct ? 'rgba(77,127,255,0.10)' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 80ms ease',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: avatarGradient(p.name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: 'white',
        }}>
          {initials(p.name)}
        </div>
        {/* Name + position */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
            {p.primary_position}
          </p>
        </div>
        {/* Label badge */}
        <span style={{
          fontSize: '9px', fontWeight: 800, color, flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}30`,
          borderRadius: '4px', padding: '2px 6px',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        {isAct && <ArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
      </button>
    )
  })

  const groupItems = groups.map(g => {
    const idx   = globalIdx++
    const isAct = idx === activeIdx
    return (
      <button
        key={g.id}
        data-idx={idx}
        onClick={() => selectItem({ kind: 'shortlist', data: g })}
        onMouseEnter={() => setActiveIdx(idx)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          width: '100%', padding: '9px 16px',
          background: isAct ? 'rgba(77,127,255,0.10)' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 80ms ease',
        }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: 'rgba(155,109,255,0.14)',
          border: '1px solid rgba(155,109,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9B6DFF',
        }}>
          <Bookmark size={14} />
        </div>
        <p style={{ margin: 0, flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {g.name}
        </p>
        {isAct && <ArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
      </button>
    )
  })

  const quickActionItems = (
    !query.trim() ? QUICK_ACTIONS : QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
  ).map(a => {
    const idx   = globalIdx++
    const isAct = idx === activeIdx
    return (
      <button
        key={a.id}
        data-idx={idx}
        onClick={() => selectItem({ kind: 'action', data: a })}
        onMouseEnter={() => setActiveIdx(idx)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          width: '100%', padding: '9px 16px',
          background: isAct ? 'rgba(77,127,255,0.10)' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 80ms ease',
        }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: 'rgba(77,127,255,0.12)',
          border: '1px solid rgba(77,127,255,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#4D7FFF',
        }}>
          {a.icon}
        </div>
        <p style={{ margin: 0, flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {a.label}
        </p>
        {isAct && <ArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
      </button>
    )
  })

  const hasResults = items.length > 0
  const isQueryEmpty = !query.trim()

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(5, 8, 18, 0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal */}
      <div
        className="command-palette-modal"
        onKeyDown={onKeyDown}
        style={{
          position: 'fixed',
          top: '20vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(620px, calc(100vw - 32px))',
          zIndex: 501,
          background: '#0D1525',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '16px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un joueur, une shortlist…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px',
              padding: '18px 0',
              fontFamily: 'inherit',
            }}
          />
          {loading && (
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.10)',
              borderTopColor: '#4D7FFF',
              animation: 'spin 0.6s linear infinite',
              flexShrink: 0,
            }} />
          )}
          <kbd style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px', padding: '2px 6px',
            fontSize: '11px', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}>
            Esc
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            maxHeight: '420px',
            overflowY: 'auto',
            padding: hasResults || isQueryEmpty ? '6px 0 8px' : '0',
          }}
        >
          {!hasResults && !isQueryEmpty && !loading && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Aucun résultat pour « {query} »
            </div>
          )}

          {renderSection('Joueurs',          <>{playerItems}</>,      players.length > 0)}
          {renderSection('Shortlists',        <>{groupItems}</>,       groups.length > 0)}
          {renderSection(
            isQueryEmpty ? 'Actions rapides' : 'Actions',
            <>{quickActionItems}</>,
            quickActionItems.length > 0,
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '1px 5px' }}>↑↓</kbd>
            naviguer
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '1px 5px' }}>↵</kbd>
            ouvrir
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '1px 5px' }}>Esc</kbd>
            fermer
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
            <Zap size={10} color="var(--accent-green)" fill="var(--accent-green)" />
            VIZION
          </span>
        </div>
      </div>
    </>
  )
}
