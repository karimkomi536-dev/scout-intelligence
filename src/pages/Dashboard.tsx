import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Star, TrendingUp, Eye, ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import type { Player } from '../types/player'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentEntry {
  id: string
  created_at: string
  players: { name: string; primary_position: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  'ELITE': '#10F090',
  'TOP PROSPECT': '#3b82f6',
  'INTERESTING': '#eab308',
  'TO MONITOR': '#f97316',
  'LOW PRIORITY': '#6b7280',
}

const POS_GROUPS: Record<string, string> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT',
}

const POS_COLORS: Record<string, string> = {
  GK: '#eab308',
  DEF: '#22c55e',
  MID: '#3b82f6',
  ATT: '#ef4444',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
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
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const allPlayers = (pData ?? []) as Player[]
      setPlayers(allPlayers)
      setRecent((rData ?? []) as unknown as RecentEntry[])

      // Monthly counts
      const now = new Date()
      const startThis = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endLast = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

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

  // ── Derived data ─────────────────────────────────────────────────────────────

  const scored = players.map(p => ({ ...p, _score: calculateScore(p), _label: getScoreLabel(calculateScore(p)) }))

  const kpis = [
    { label: 'Total Players', value: players.length, icon: Users, color: '#3b82f6' },
    { label: 'Elite', value: scored.filter(p => p._label === 'ELITE').length, icon: Star, color: '#10F090' },
    { label: 'Top Prospect', value: scored.filter(p => p._label === 'TOP PROSPECT').length, icon: TrendingUp, color: '#3b82f6' },
    { label: 'To Monitor', value: scored.filter(p => p._label === 'TO MONITOR').length, icon: Eye, color: '#f97316' },
  ]

  const labelOrder = ['ELITE', 'TOP PROSPECT', 'INTERESTING', 'TO MONITOR', 'LOW PRIORITY']
  const distData = labelOrder.map(label => ({
    label,
    count: scored.filter(p => p._label === label).length,
    color: LABEL_COLORS[label],
  })).filter(d => d.count > 0)

  const posGroupCounts: Record<string, number> = {}
  players.forEach(p => {
    const g = POS_GROUPS[p.primary_position] ?? 'Autre'
    posGroupCounts[g] = (posGroupCounts[g] ?? 0) + 1
  })
  const posData = Object.entries(posGroupCounts).map(([name, value]) => ({ name, value, color: POS_COLORS[name] ?? '#6b7280' }))

  const top5 = [...scored].sort((a, b) => b._score - a._score).slice(0, 5)

  const monthDelta = lastMonth === 0 ? null : Math.round(((thisMonth - lastMonth) / lastMonth) * 100)

  if (loading) return <p style={{ color: '#6b7280' }}>Chargement…</p>

  return (
    <div style={{ color: 'white' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Dashboard</h2>
      <p style={{ color: '#9ca3af', marginBottom: '28px', fontSize: '14px' }}>Vue d'ensemble de votre activité de scouting</p>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#111827', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ color, background: '#1f2937', padding: '10px', borderRadius: '8px', flexShrink: 0 }}>
              <Icon size={18} />
            </div>
            <div>
              <p style={{ fontSize: '26px', fontWeight: 'bold', margin: 0 }}>{value}</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2 : Distribution + Position + Monthly KPI ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: '14px', marginBottom: '24px' }}>

        {/* Distribution par catégorie */}
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Distribution des scores</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distData} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={110} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#1f2937' }}
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '12px' }}
                formatter={(v: number) => [`${v} joueurs`, '']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {distData.map(d => <Cell key={d.label} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par poste */}
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Répartition par poste</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={posData}
                cx="45%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {posData.map(d => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '12px' }}
                formatter={(v: number, name: string) => [`${v} joueurs`, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '12px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* KPI mensuel */}
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Joueurs ajoutés ce mois</p>
          <p style={{ fontSize: '42px', fontWeight: 'bold', margin: '0 0 10px', color: 'white' }}>{thisMonth}</p>
          {monthDelta !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
              {monthDelta > 0
                ? <><ArrowUpRight size={15} color="#22c55e" /><span style={{ color: '#22c55e' }}>+{monthDelta}%</span></>
                : monthDelta < 0
                ? <><ArrowDownRight size={15} color="#ef4444" /><span style={{ color: '#ef4444' }}>{monthDelta}%</span></>
                : <><Minus size={15} color="#6b7280" /><span style={{ color: '#6b7280' }}>0%</span></>
              }
              <span style={{ color: '#4b5563' }}>vs mois dernier ({lastMonth})</span>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: '#4b5563', margin: 0 }}>Pas de données le mois précédent</p>
          )}
        </div>
      </div>

      {/* ── Row 3 : Top 5 + Activité récente ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Top 5 joueurs */}
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Top 5 joueurs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {top5.map((p, i) => {
              const labelColor = LABEL_COLORS[p._label] || '#6b7280'
              const initials = p.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/players/${p.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: '#0f172a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0f172a')}
                >
                  <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 700, width: '16px' }}>{i + 1}</span>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#9ca3af', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>{p.team} · {p.primary_position}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: labelColor }}>{p._score}</span>
                    <ArrowRight size={13} color="#374151" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activité récente */}
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>Activité récente</h3>
          {recent.length === 0 ? (
            <p style={{ color: '#4b5563', fontSize: '13px' }}>Aucune activité pour l'instant.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {recent.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: i < recent.length - 1 ? '1px solid #1f2937' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: '5px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#e5e7eb' }}>
                      <span style={{ fontWeight: 600 }}>{entry.players?.name ?? 'Joueur inconnu'}</span>
                      {' '}ajouté à une shortlist
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4b5563' }}>
                      {entry.players?.primary_position}{entry.players?.primary_position ? ' · ' : ''}{relativeTime(entry.created_at)}
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
