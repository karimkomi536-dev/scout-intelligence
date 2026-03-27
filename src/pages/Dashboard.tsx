import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Star, TrendingUp, Eye, ArrowRight, Upload, Bookmark } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import { useAuth } from '../contexts/AuthContext'
import type { Player } from '../types/player'

// ── Constants ─────────────────────────────────────────────────────────────────

const LABEL_META: Record<string, { color: string; glow: string; bg: string }> = {
  'ELITE':        { color: '#00C896', glow: 'rgba(0,200,150,0.35)',   bg: 'rgba(0,200,150,0.10)'  },
  'TOP PROSPECT': { color: '#4D7FFF', glow: 'rgba(77,127,255,0.35)',  bg: 'rgba(77,127,255,0.10)' },
  'INTERESTING':  { color: '#F5A623', glow: 'rgba(245,166,35,0.30)',  bg: 'rgba(245,166,35,0.08)' },
  'TO MONITOR':   { color: '#9B6DFF', glow: 'rgba(155,109,255,0.30)', bg: 'rgba(155,109,255,0.08)'},
  'LOW PRIORITY': { color: '#4A5A70', glow: 'rgba(74,90,112,0.20)',   bg: 'rgba(74,90,112,0.08)'  },
}

const POS_GROUPS: Record<string, string> = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT',
}
const POS_COLORS: Record<string, string> = {
  GK: '#F5A623', DEF: '#00C896', MID: '#4D7FFF', ATT: '#9B6DFF',
}

const TOOLTIP_STYLE = {
  background: '#0D1525',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: '#E2EAF4',
  fontSize: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}

interface RecentEntry {
  id: string
  created_at: string
  players: { name: string; primary_position: string } | null
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function formatGreeting(email: string) {
  const name = email.split('@')[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function formatFullDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1)
      // ease-out cubic
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

// ── Score ring SVG (40px) ─────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="40" height="40" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle
        cx="20" cy="20" r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
      />
      <text x="20" y="24" textAnchor="middle" fill={color}
        style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600 }}>
        {score}
      </text>
    </svg>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, glow, delta }: {
  label: string; value: number; icon: React.ElementType
  color: string; glow: string; delta?: string | null
}) {
  const display = useCountUp(value)
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow orb top-right */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: glow, filter: 'blur(28px)', pointerEvents: 'none',
      }} />

      {/* Icon in circle */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: `${color}18`, border: `1px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '14px',
        boxShadow: `0 0 14px ${glow}`,
      }}>
        <Icon size={17} color={color} />
      </div>

      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700,
        color, margin: '0 0 2px', lineHeight: 1,
        textShadow: `0 0 20px ${glow}`,
      }}>
        {display}
      </p>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>

      {delta && (
        <p style={{ fontSize: '11px', color: delta.startsWith('+') ? '#00C896' : '#ef4444', margin: '8px 0 0', fontFamily: 'var(--font-mono)' }}>
          {delta} ce mois
        </p>
      )}
    </div>
  )
}

// ── Live badge ────────────────────────────────────────────────────────────────

function LiveBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 500,
      color: '#00C896', background: 'rgba(0,200,150,0.10)',
      border: '1px solid rgba(0,200,150,0.25)', borderRadius: '4px',
      padding: '2px 8px', letterSpacing: '0.06em',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: '#00C896',
        boxShadow: '0 0 6px #00C896',
        animation: 'pulse 2s ease infinite',
        display: 'inline-block',
      }} />
      LIVE
    </span>
  )
}

// ── Label badge (text) ────────────────────────────────────────────────────────

function LabelBadge({ label }: { label: string }) {
  const meta = LABEL_META[label] ?? LABEL_META['LOW PRIORITY']
  const shortLabel: Record<string, string> = {
    'ELITE': 'ELITE',
    'TOP PROSPECT': 'PROSPECT',
    'INTERESTING': 'INTERESTING',
    'TO MONITOR': 'MONITOR',
    'LOW PRIORITY': 'LOW',
  }
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '9px', fontWeight: 500,
      color: meta.color,
      background: meta.bg,
      border: `1px solid ${meta.color}30`,
      borderRadius: '4px',
      padding: '1px 5px',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {shortLabel[label] ?? label}
    </span>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [players, setPlayers] = useState<Player[]>([])
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [thisMonth, setThisMonth] = useState(0)
  const [lastMonth, setLastMonth] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase.from('players').select('*'),
        supabase.from('shortlists')
          .select('id, created_at, players(name, primary_position)')
          .order('created_at', { ascending: false }).limit(5),
      ])
      setPlayers((pData ?? []) as Player[])
      setRecent((rData ?? []) as unknown as RecentEntry[])

      const now = new Date()
      const startThis = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endLast   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const [{ count: cThis }, { count: cLast }] = await Promise.all([
        supabase.from('players').select('id', { count: 'exact', head: true }).gte('created_at', startThis),
        supabase.from('players').select('id', { count: 'exact', head: true }).gte('created_at', startLast).lt('created_at', endLast),
      ])
      setThisMonth(cThis ?? 0)
      setLastMonth(cLast ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const scored = players.map(p => ({
    ...p,
    _score: calculateScore(p),
    _label: getScoreLabel(calculateScore(p)),
  }))

  const countByLabel = (label: string) => scored.filter(p => p._label === label).length
  const top5 = [...scored].sort((a, b) => b._score - a._score).slice(0, 5)

  // Area chart: distribution by label per score bucket (10-point buckets)
  const buckets: Record<number, Record<string, number>> = {}
  scored.forEach(p => {
    const b = Math.floor(p._score / 10) * 10
    buckets[b] = buckets[b] ?? {}
    buckets[b][p._label] = (buckets[b][p._label] ?? 0) + 1
  })
  const areaData = Array.from({ length: 10 }, (_, i) => {
    const b = i * 10
    return {
      score: `${b}-${b + 9}`,
      ELITE: buckets[b]?.['ELITE'] ?? 0,
      'TOP PROSPECT': buckets[b]?.['TOP PROSPECT'] ?? 0,
      INTERESTING: buckets[b]?.['INTERESTING'] ?? 0,
      'TO MONITOR': buckets[b]?.['TO MONITOR'] ?? 0,
    }
  })

  const posGroupCounts: Record<string, number> = {}
  players.forEach(p => {
    const g = POS_GROUPS[p.primary_position] ?? 'Autre'
    posGroupCounts[g] = (posGroupCounts[g] ?? 0) + 1
  })
  const posData = Object.entries(posGroupCounts).map(([name, value]) => ({
    name, value, color: POS_COLORS[name] ?? '#4A5A70',
  }))

  const monthDelta = lastMonth > 0
    ? (thisMonth >= lastMonth ? `+${thisMonth - lastMonth}` : `${thisMonth - lastMonth}`)
    : null

  const greeting = user?.email ? formatGreeting(user.email) : 'Scout'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Chargement…</p>
    </div>
  )

  return (
    <div style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Bonjour {greeting} 👋
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>
            {formatFullDate()}
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: 'var(--accent-blue)', color: 'white',
            border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600,
            padding: isMobile ? '9px 12px' : '10px 18px',
            cursor: 'pointer', transition: 'box-shadow 200ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(77,127,255,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          <Upload size={14} />
          {!isMobile && 'Importer des joueurs'}
        </button>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '14px' }}>
        <KpiCard label="Total Joueurs"  value={players.length}               icon={Users}      color="#4D7FFF" glow="rgba(77,127,255,0.3)"   delta={monthDelta} />
        <KpiCard label="Elite"          value={countByLabel('ELITE')}        icon={Star}       color="#00C896" glow="rgba(0,200,150,0.3)"    />
        <KpiCard label="Top Prospect"   value={countByLabel('TOP PROSPECT')} icon={TrendingUp} color="#4D7FFF" glow="rgba(77,127,255,0.25)" />
        <KpiCard label="À surveiller"   value={countByLabel('TO MONITOR')}   icon={Eye}        color="#9B6DFF" glow="rgba(155,109,255,0.25)" />
      </div>

      {/* ── Main row : Area chart (2/3) + Top 5 (1/3) ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '14px' }}>

        {/* Area chart */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Distribution des talents
            </h3>
            <LiveBadge />
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <AreaChart data={areaData} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gElite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00C896" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProspect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4D7FFF" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#4D7FFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInteresting" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F5A623" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMonitor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#9B6DFF" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#9B6DFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="score" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Area type="monotone" dataKey="ELITE"        stroke="#00C896" strokeWidth={2} fill="url(#gElite)"       dot={false} style={{ filter: 'drop-shadow(0 0 6px #00C896)' }} />
              <Area type="monotone" dataKey="TOP PROSPECT" stroke="#4D7FFF" strokeWidth={2} fill="url(#gProspect)"    dot={false} style={{ filter: 'drop-shadow(0 0 6px #4D7FFF)' }} />
              <Area type="monotone" dataKey="INTERESTING"  stroke="#F5A623" strokeWidth={2} fill="url(#gInteresting)" dot={false} style={{ filter: 'drop-shadow(0 0 6px #F5A623)' }} />
              <Area type="monotone" dataKey="TO MONITOR"   stroke="#9B6DFF" strokeWidth={2} fill="url(#gMonitor)"     dot={false} style={{ filter: 'drop-shadow(0 0 6px #9B6DFF)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Top 5</h3>
            <button onClick={() => navigate('/players')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              Voir tous →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {top5.map((p, i) => {
              const meta = LABEL_META[p._label] ?? LABEL_META['LOW PRIORITY']
              const initials = p.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
              return (
                <div key={p.id}
                  onClick={() => navigate(`/players/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                    background: 'transparent', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', width: '14px', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${meta.color}20`, border: `1px solid ${meta.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, color: meta.color, flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.primary_position}</span>
                      <LabelBadge label={p._label} />
                    </div>
                  </div>
                  <ScoreRing score={p._score} color={meta.color} />
                  {!isMobile && <ArrowRight size={12} color="var(--text-muted)" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom row : Donut + Activity ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>

        {/* Donut */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Répartition par poste</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 14px' }}>{players.length} joueurs analysés</p>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
            <PieChart>
              <Pie data={posData} cx="40%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value">
                {posData.map(d => (
                  <Cell key={d.name} fill={d.color}
                    style={{ filter: `drop-shadow(0 0 6px ${d.color}80)` }}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v} joueurs`, name]} />
              <Legend
                layout="vertical" align="right" verticalAlign="middle"
                iconType="circle" iconSize={7}
                formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Activity feed */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Activité récente</h3>
          {recent.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Aucune activité pour l'instant.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recent.map((entry, i) => (
                <div key={entry.id} style={{
                  display: 'flex', gap: '12px', padding: '10px 0',
                  borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
                    background: 'rgba(77,127,255,0.12)', border: '1px solid rgba(77,127,255,0.20)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bookmark size={13} color="#4D7FFF" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600 }}>{entry.players?.name ?? 'Joueur'}</span>
                      {' '}ajouté à une shortlist
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {entry.players?.primary_position && `${entry.players.primary_position} · `}{relativeTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
