import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Star, TrendingUp, Eye, ArrowRight, Upload, Bookmark, Zap, Clock, RefreshCw } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import { useAuth } from '../contexts/AuthContext'
import { OnboardingChecklist } from '../components/OnboardingChecklist'
import { ScoreSparkline } from '../components/ScoreSparkline'
import { getTrend } from '../utils/trend'
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentEntry {
  id:         string
  created_at: string
  players:    { name: string; primary_position: string } | null
}

interface CronLog {
  created_at:      string
  status:          string
  players_updated: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 16, circ = 2 * Math.PI * r
  return (
    <svg width="40" height="40" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round" transform="rotate(-90 20 20)"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
      />
      <text x="20" y="24" textAnchor="middle" fill={color}
        style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600 }}>
        {score}
      </text>
    </svg>
  )
}

function KpiCard({ label, value, icon: Icon, color, glow, delta }: {
  label: string; value: number; icon: React.ElementType
  color: string; glow: string; delta?: string | null
}) {
  const display = useCountUp(value)
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: glow, filter: 'blur(28px)', pointerEvents: 'none' }} />
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: `0 0 14px ${glow}` }}>
        <Icon size={17} color={color} />
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700, color, margin: '0 0 2px', lineHeight: 1, textShadow: `0 0 20px ${glow}` }}>{display}</p>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      {delta && (
        <p style={{ fontSize: '11px', color: delta.startsWith('+') ? '#00C896' : '#ef4444', margin: '8px 0 0', fontFamily: 'var(--font-mono)' }}>
          {delta} ce mois
        </p>
      )}
    </div>
  )
}

function LiveBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 500, color: '#00C896', background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: '4px', padding: '2px 8px', letterSpacing: '0.06em' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C896', boxShadow: '0 0 6px #00C896', animation: 'pulse 2s ease infinite', display: 'inline-block' }} />
      LIVE
    </span>
  )
}

function LabelBadge({ label }: { label: string }) {
  const meta = LABEL_META[label] ?? LABEL_META['LOW PRIORITY']
  const short: Record<string, string> = { 'ELITE': 'ELITE', 'TOP PROSPECT': 'PROSPECT', 'INTERESTING': 'INTERESTING', 'TO MONITOR': 'MONITOR', 'LOW PRIORITY': 'LOW' }
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 500, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30`, borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {short[label] ?? label}
    </span>
  )
}

// ── Player row (reused in top5 + u23) ─────────────────────────────────────────

function PlayerRow({ p, rank, score, label, navigate }: {
  p: Player; rank: number; score: number; label: string; navigate: (path: string) => void
}) {
  const meta = LABEL_META[label] ?? LABEL_META['LOW PRIORITY']
  const initials = p.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  return (
    <div
      onClick={() => navigate(`/players/${p.id}`)}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', transition: 'background 150ms' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', width: '14px', textAlign: 'center', flexShrink: 0 }}>{rank}</span>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${meta.color}20`, border: `1px solid ${meta.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: meta.color, flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.primary_position}</span>
          <LabelBadge label={label} />
        </div>
      </div>
      <ScoreRing score={score} color={meta.color} />
      <ArrowRight size={12} color="var(--text-muted)" />
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const isMobile  = useIsMobile()

  // All hooks declared before any conditional return
  const [players,    setPlayers]    = useState<Player[]>([])
  const [topPlayers, setTopPlayers] = useState<Player[]>([])
  const [u23Players, setU23Players] = useState<Player[]>([])
  const [recent,     setRecent]     = useState<RecentEntry[]>([])
  const [cronLog,    setCronLog]    = useState<CronLog | null>(null)
  const [thisMonth,  setThisMonth]  = useState(0)
  const [lastMonth,  setLastMonth]  = useState(0)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const now       = new Date()
      const startThis = new Date(now.getFullYear(), now.getMonth(),     1).toISOString()
      const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endLast   = startThis

      const [
        { data: pData },
        { data: topData },
        { data: u23Data },
        { data: rData },
        { data: cData },
        { count: cThis },
        { count: cLast },
      ] = await Promise.all([
        // All players (minimal fields) — for charts
        supabase.from('players').select('id, name, team, primary_position, scout_score, scout_label, is_u23, xg, xa, goals, assists, minutes_played, appearances'),

        // Top 5 by scout_score
        supabase.from('players')
          .select('id, name, team, primary_position, scout_score, scout_label')
          .order('scout_score', { ascending: false })
          .limit(5),

        // Top 3 U23
        supabase.from('players')
          .select('id, name, team, primary_position, scout_score, scout_label, age')
          .eq('is_u23', true)
          .order('scout_score', { ascending: false })
          .limit(3),

        // Recent shortlist activity (7 days) — correct table: shortlist_entries
        supabase.from('shortlist_entries')
          .select('id, created_at, players:player_id(name, primary_position)')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(8),

        // Last cron log
        supabase.from('cron_logs')
          .select('created_at, status, players_updated')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // This month count
        supabase.from('players').select('id', { count: 'exact', head: true }).gte('created_at', startThis),

        // Last month count
        supabase.from('players').select('id', { count: 'exact', head: true }).gte('created_at', startLast).lt('created_at', endLast),
      ])

      setPlayers((pData ?? []) as unknown as Player[])
      setTopPlayers((topData ?? []) as unknown as Player[])
      setU23Players((u23Data ?? []) as unknown as Player[])
      setRecent((rData ?? []) as unknown as RecentEntry[])
      setCronLog(cData as CronLog | null)
      setThisMonth(cThis ?? 0)
      setLastMonth(cLast ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const scored = players.map(p => ({
    ...p,
    _score: p.scout_score ?? calculateScore(p),
    _label: p.scout_label ?? getScoreLabel(p.scout_score ?? calculateScore(p)),
  }))

  const countByLabel = (label: string) => scored.filter(p => p._label === label).length

  const hotPlayers = scored
    .filter(p => p._score >= 65)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)

  const buckets: Record<number, Record<string, number>> = {}
  scored.forEach(p => {
    const b = Math.floor(p._score / 10) * 10
    buckets[b] = buckets[b] ?? {}
    buckets[b][p._label] = (buckets[b][p._label] ?? 0) + 1
  })
  const areaData = Array.from({ length: 10 }, (_, i) => {
    const b = i * 10
    return { score: `${b}-${b + 9}`, ELITE: buckets[b]?.['ELITE'] ?? 0, 'TOP PROSPECT': buckets[b]?.['TOP PROSPECT'] ?? 0, INTERESTING: buckets[b]?.['INTERESTING'] ?? 0, 'TO MONITOR': buckets[b]?.['TO MONITOR'] ?? 0 }
  })

  const posGroupCounts: Record<string, number> = {}
  players.forEach(p => {
    const g = POS_GROUPS[p.primary_position] ?? 'Autre'
    posGroupCounts[g] = (posGroupCounts[g] ?? 0) + 1
  })
  const posData = Object.entries(posGroupCounts).map(([name, value]) => ({ name, value, color: POS_COLORS[name] ?? '#4A5A70' }))

  const monthDelta = lastMonth > 0
    ? (thisMonth >= lastMonth ? `+${thisMonth - lastMonth}` : `${thisMonth - lastMonth}`)
    : null

  const greeting = user?.email ? formatGreeting(user.email) : 'Scout'

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Chargement…</p>
    </div>
  )

  return (
    <div style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Onboarding checklist ───────────────────────────────────────────── */}
      <OnboardingChecklist />

      {/* ── Empty base banner ─────────────────────────────────────────────── */}
      {players.length === 0 && (
        <div style={{
          background: 'rgba(245,166,35,0.10)',
          border: '1px solid rgba(245,166,35,0.35)',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F5A623' }}>Base de joueurs vide</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Lance <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>npm run import:2425</code> pour importer les données 2024-25.
            </p>
          </div>
          <button onClick={() => navigate('/upload')} style={{ background: '#F5A623', color: '#000', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Importer →
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
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
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, padding: isMobile ? '9px 12px' : '10px 18px', cursor: 'pointer', transition: 'box-shadow 200ms ease', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(77,127,255,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          <Upload size={14} />
          {!isMobile && 'Importer des joueurs'}
        </button>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '14px' }}>
        <KpiCard label="Total Joueurs"  value={players.length}               icon={Users}      color="#4D7FFF" glow="rgba(77,127,255,0.3)"   delta={monthDelta} />
        <KpiCard label="Elite"          value={countByLabel('ELITE')}        icon={Star}       color="#00C896" glow="rgba(0,200,150,0.3)"    />
        <KpiCard label="Top Prospect"   value={countByLabel('TOP PROSPECT')} icon={TrendingUp} color="#4D7FFF" glow="rgba(77,127,255,0.25)" />
        <KpiCard label="À surveiller"   value={countByLabel('TO MONITOR')}   icon={Eye}        color="#9B6DFF" glow="rgba(155,109,255,0.25)" />
      </div>

      {/* ── Stats rapides ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>

        {/* Elite + Prospect */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Star size={16} color="#00C896" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#00C896', fontFamily: 'var(--font-mono)' }}>
              {countByLabel('ELITE') + countByLabel('TOP PROSPECT')}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Élite + Top Prospect</p>
          </div>
        </div>

        {/* U23 count */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={16} color="#F5A623" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F5A623', fontFamily: 'var(--font-mono)' }}>
              {players.filter(p => p.is_u23).length}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Joueurs U23</p>
          </div>
        </div>

        {/* Last sync */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: cronLog?.status === 'success' ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${cronLog?.status === 'success' ? 'rgba(0,200,150,0.25)' : 'rgba(255,255,255,0.10)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RefreshCw size={16} color={cronLog?.status === 'success' ? '#00C896' : 'var(--text-muted)'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {cronLog ? `${cronLog.players_updated ?? 0} mis à jour` : 'Aucune synchro'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              {cronLog ? relativeTime(cronLog.created_at) : 'Lance npm run snapshot'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main row : Area chart + Top joueurs ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '14px' }}>

        {/* Area chart */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Distribution des talents</h3>
            <LiveBadge />
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <AreaChart data={areaData} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gElite"       x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#00C896" stopOpacity={0.28} /><stop offset="95%" stopColor="#00C896" stopOpacity={0} /></linearGradient>
                <linearGradient id="gProspect"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#4D7FFF" stopOpacity={0.28} /><stop offset="95%" stopColor="#4D7FFF" stopOpacity={0} /></linearGradient>
                <linearGradient id="gInteresting" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#F5A623" stopOpacity={0.22} /><stop offset="95%" stopColor="#F5A623" stopOpacity={0} /></linearGradient>
                <linearGradient id="gMonitor"     x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#9B6DFF" stopOpacity={0.22} /><stop offset="95%" stopColor="#9B6DFF" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="score" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }} itemStyle={{ color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="ELITE"        stroke="#00C896" strokeWidth={2} fill="url(#gElite)"       dot={false} style={{ filter: 'drop-shadow(0 0 6px #00C896)' }} />
              <Area type="monotone" dataKey="TOP PROSPECT" stroke="#4D7FFF" strokeWidth={2} fill="url(#gProspect)"    dot={false} style={{ filter: 'drop-shadow(0 0 6px #4D7FFF)' }} />
              <Area type="monotone" dataKey="INTERESTING"  stroke="#F5A623" strokeWidth={2} fill="url(#gInteresting)" dot={false} style={{ filter: 'drop-shadow(0 0 6px #F5A623)' }} />
              <Area type="monotone" dataKey="TO MONITOR"   stroke="#9B6DFF" strokeWidth={2} fill="url(#gMonitor)"     dot={false} style={{ filter: 'drop-shadow(0 0 6px #9B6DFF)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top joueurs en ce moment */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Top joueurs</h3>
            <button onClick={() => navigate('/players')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              Voir tous →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {topPlayers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Aucun joueur en base.</p>
            ) : topPlayers.map((p, i) => {
              const score = p.scout_score ?? 0
              const label = p.scout_label ?? getScoreLabel(score)
              return <PlayerRow key={p.id} p={p} rank={i + 1} score={score} label={label} navigate={navigate} />
            })}
          </div>
        </div>
      </div>

      {/* ── Pépites U23 ────────────────────────────────────────────────────── */}
      {u23Players.length > 0 && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#F5A623" />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Pépites U23</h3>
            </div>
            <button onClick={() => navigate('/players?age_max=23')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              Voir U23 →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {u23Players.map((p, i) => {
              const score = p.scout_score ?? 0
              const label = p.scout_label ?? getScoreLabel(score)
              const meta  = LABEL_META[label] ?? LABEL_META['LOW PRIORITY']
              const initials = p.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
              return (
                <div key={p.id}
                  onClick={() => navigate(`/players/${p.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', width: '14px', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${meta.color}20`, border: `1px solid ${meta.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: meta.color, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.primary_position} · {p.team}</span>
                    </div>
                  </div>
                  {/* U23 badge */}
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#F5A623', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.30)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>U23</span>
                  <ScoreRing score={score} color={meta.color} />
                  <ArrowRight size={12} color="var(--text-muted)" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Top 3 progressions ─────────────────────────────────────────────── */}
      {hotPlayers.length > 0 && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="#00C896" />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Top 3 progressions</h3>
            </div>
            <button onClick={() => navigate('/players?trend=hot&trend=rising')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              En forme →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {hotPlayers.map((p, rank) => {
              const meta = LABEL_META[p._label] ?? LABEL_META['LOW PRIORITY']
              const initials = p.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
              const simScores = p._score >= 85 ? [p._score - 8, p._score - 4, p._score] : [p._score - 3, p._score - 1, p._score]
              const trend = getTrend(simScores)
              const delta = simScores[simScores.length - 1] - simScores[0]
              return (
                <div key={p.id}
                  onClick={() => navigate(`/players/${p.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', width: '14px', textAlign: 'center', flexShrink: 0 }}>{rank + 1}</span>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${meta.color}20`, border: `1px solid ${meta.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: meta.color, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--text-muted)' }}>{p.primary_position} · {p.team}</p>
                  </div>
                  <ScoreSparkline scores={simScores} width={48} height={20} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: trend.color, background: `${trend.color}12`, border: `1px solid ${trend.color}30`, borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>
                    +{delta.toFixed(0)} pts
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Bottom row : Donut + Activity ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>

        {/* Donut */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Répartition par poste</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 14px' }}>{players.length} joueurs analysés</p>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
            <PieChart>
              <Pie data={posData} cx="40%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value">
                {posData.map(d => <Cell key={d.name} fill={d.color} style={{ filter: `drop-shadow(0 0 6px ${d.color}80)` }} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v} joueurs`, name]} />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={7}
                formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Activity feed */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
            Activité récente
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>7 derniers jours</span>
          </h3>
          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <Bookmark size={28} color="rgba(255,255,255,0.12)" style={{ marginBottom: 10 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 12px' }}>Aucune activité cette semaine.</p>
              <button
                onClick={() => navigate('/players')}
                style={{ background: 'rgba(77,127,255,0.12)', border: '1px solid rgba(77,127,255,0.25)', color: '#4D7FFF', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Explorer les joueurs →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recent.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', flexShrink: 0, background: 'rgba(77,127,255,0.12)', border: '1px solid rgba(77,127,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
