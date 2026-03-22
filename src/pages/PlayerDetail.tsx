import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale, CheckCircle } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel, getRadarAxes } from '../utils/scoring'
import { useCompare } from '../contexts/CompareContext'
import type { Player } from '../types/player'

const labelColors: Record<string, string> = {
  'ELITE':        '#10F090',
  'TOP PROSPECT': '#3b82f6',
  'INTERESTING':  '#eab308',
  'TO MONITOR':   '#f97316',
  'LOW PRIORITY': '#6b7280',
}

const positionColors: Record<string, string> = {
  ST: '#ef4444', RW: '#f97316', LW: '#f97316',
  CM: '#3b82f6', CAM: '#8b5cf6', CDM: '#6366f1',
  CB: '#22c55e', LB: '#10b981', RB: '#10b981',
  GK: '#eab308',
}

interface StatCardProps { label: string; value: string | number; sub?: string }
function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px 20px' }}>
      <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: 'white' }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{sub}</p>}
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const fill = ((score || 0) / 100) * circ
  const color = score >= 75 ? '#10F090' : score >= 50 ? '#3b82f6' : score >= 30 ? '#f97316' : '#6b7280'

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={70} cy={70} r={r} fill="none" stroke="#1f2937" strokeWidth={10} />
      <circle
        cx={70} cy={70} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={70} y={65} textAnchor="middle" fill="white" fontSize={28} fontWeight={700}>{score ?? '—'}</text>
      <text x={70} y={83} textAnchor="middle" fill="#6b7280" fontSize={11}>/ 100</text>
    </svg>
  )
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSelected, toggle, ids: compareIds } = useCompare()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.from('players').select('*').eq('id', id).single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('Player not found.')
        else setPlayer(data as Player)
        setLoading(false)
      })
  }, [id])

  if (loading) return <p style={{ color: '#6b7280', padding: '32px' }}>Loading...</p>
  if (error || !player) return (
    <div style={{ color: 'white', padding: '32px' }}>
      <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
      <button onClick={() => navigate('/players')} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to players</button>
    </div>
  )

  const score = calculateScore(player)
  const label = getScoreLabel(score)

  const radarData = player.individual_stats
    ? getRadarAxes(player.primary_position).map(axis => ({
        stat: axis,
        value: player.individual_stats![axis.toLowerCase() as keyof typeof player.individual_stats] ?? 0,
      }))
    : []

  const initials = (player.name || '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  const posColor = positionColors[player.primary_position] || '#6b7280'
  const labelColor = labelColors[label] || '#6b7280'

  function fmt(v: any, decimals = 1) {
    const n = Number(v)
    return isNaN(n) || n === 0 ? '—' : n.toFixed(decimals)
  }

  return (
    <div style={{ color: 'white', maxWidth: '960px' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/players')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to players
      </button>

      {/* Header card */}
      <div style={{ background: '#111827', borderRadius: '16px', padding: '28px', marginBottom: '20px', display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#9ca3af', flexShrink: 0 }}>
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>{player.name}</h1>
            <span style={{ background: posColor + '22', color: posColor, fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px' }}>
              {player.primary_position}
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 12px' }}>
            {player.team}{player.competition ? ` · ${player.competition}` : ''}{player.age ? ` · Age ${player.age}` : ''}
            {player.nationality ? ` · ${player.nationality}` : ''}{player.foot ? ` · ${player.foot} foot` : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ background: labelColor + '22', color: labelColor, fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '6px' }}>
              {label}
            </span>
            <button
              onClick={() => player && (compareIds.length < 3 || isSelected(player.id)) && toggle(player.id)}
              disabled={compareIds.length >= 3 && !isSelected(player?.id ?? '')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isSelected(player?.id ?? '') ? '#10F09022' : '#1f2937', border: `1px solid ${isSelected(player?.id ?? '') ? '#10F090' : '#374151'}`, borderRadius: '7px', color: isSelected(player?.id ?? '') ? '#10F090' : '#9ca3af', fontSize: '12px', fontWeight: 600, padding: '4px 12px', cursor: 'pointer' }}
            >
              {isSelected(player?.id ?? '') ? <><CheckCircle size={13} /> Dans le comparateur</> : <><Scale size={13} /> Comparer</>}
            </button>
          </div>
        </div>

        {/* Score ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <ScoreRing score={score} />
          <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scout Score</p>
        </div>
      </div>

      {/* Stats + Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: radarData.length ? '1fr 320px' : '1fr', gap: '20px', alignItems: 'start' }}>
        {/* Stats grid */}
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Playing Time</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <StatCard label="Appearances" value={fmt(player.appearances, 0)} />
            <StatCard label="Minutes Played" value={fmt(player.minutes_played, 0)} />
          </div>

          <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Attack</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <StatCard label="Goals" value={fmt(player.goals, 0)} />
            <StatCard label="Assists" value={fmt(player.assists, 0)} />
            <StatCard label="xG" value={fmt(player.xg)} />
            <StatCard label="xA" value={fmt(player.xa)} />
            <StatCard label="Shot-Creating Actions" value={fmt(player.shot_creating_actions, 0)} />
          </div>

          <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Defence</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <StatCard label="Tackles" value={fmt(player.tackles, 0)} />
            <StatCard label="Interceptions" value={fmt(player.interceptions, 0)} />
            <StatCard label="Blocks" value={fmt(player.blocks, 0)} />
            <StatCard label="Clearances" value={fmt(player.clearances, 0)} />
            <StatCard label="Pressures" value={fmt(player.pressures, 0)} />
            <StatCard label="Pressure Success" value={player.pressure_success_rate ? fmt(player.pressure_success_rate) + '%' : '—'} />
          </div>

          <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Passing</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <StatCard label="Pass Completion" value={player.pass_completion_rate ? fmt(player.pass_completion_rate) + '%' : '—'} />
            <StatCard label="Progressive Passes" value={fmt(player.progressive_passes, 0)} />
            <StatCard label="Key Passes" value={fmt(player.key_passes, 0)} />
          </div>
        </div>

        {/* Radar chart */}
        {radarData.length > 0 && (
          <div style={{ background: '#111827', borderRadius: '16px', padding: '24px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Player Profile</p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#1f2937" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Radar dataKey="value" fill="#3b82f6" fillOpacity={0.25} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              {radarData.map(({ stat, value }) => (
                <div key={stat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>{stat}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
