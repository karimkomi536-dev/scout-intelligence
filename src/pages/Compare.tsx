import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Search } from 'lucide-react'
import { usePlan } from '../hooks/usePlan'
import { UpgradeBanner } from '../components/UpgradeBanner'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import type { Player, IndividualStats } from '../types/player'

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#10F090', '#f97316']

const RADAR_AXES = ['Technique', 'Physical', 'Pace', 'Mental', 'Tactical', 'Potential']

const STAT_SECTIONS: { label: string; stats: { label: string; key: string; fmt?: (v: number) => string }[] }[] = [
  {
    label: 'Général',
    stats: [
      { label: 'Scout Score', key: '_score', fmt: v => String(Math.round(v)) },
    ],
  },
  {
    label: 'Attaque',
    stats: [
      { label: 'Goals', key: 'goals', fmt: v => v.toFixed(0) },
      { label: 'Assists', key: 'assists', fmt: v => v.toFixed(0) },
      { label: 'xG', key: 'xg', fmt: v => v.toFixed(2) },
      { label: 'xA', key: 'xa', fmt: v => v.toFixed(2) },
      { label: 'Shot-Creating Actions', key: 'shot_creating_actions', fmt: v => v.toFixed(0) },
    ],
  },
  {
    label: 'Défense',
    stats: [
      { label: 'Tackles', key: 'tackles', fmt: v => v.toFixed(0) },
      { label: 'Interceptions', key: 'interceptions', fmt: v => v.toFixed(0) },
      { label: 'Blocks', key: 'blocks', fmt: v => v.toFixed(0) },
      { label: 'Clearances', key: 'clearances', fmt: v => v.toFixed(0) },
      { label: 'Pressures', key: 'pressures', fmt: v => v.toFixed(0) },
    ],
  },
  {
    label: 'Passes',
    stats: [
      { label: 'Pass Completion', key: 'pass_completion_rate', fmt: v => v.toFixed(1) + '%' },
      { label: 'Progressive Passes', key: 'progressive_passes', fmt: v => v.toFixed(0) },
      { label: 'Key Passes', key: 'key_passes', fmt: v => v.toFixed(0) },
    ],
  },
]

const ROLE_MAP: Record<string, string> = {
  ST: 'avant-centre', RW: 'ailier droit', LW: 'ailier gauche',
  CAM: 'meneur de jeu', CM: 'milieu relayeur', CDM: 'milieu défensif',
  CB: 'défenseur central', RB: 'latéral droit', LB: 'latéral gauche',
  GK: 'gardien de but',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatValue(player: Player, key: string): number {
  if (key === '_score') return calculateScore(player)
  return (player as unknown as Record<string, number>)[key] ?? 0
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerCard({ player, color, onRemove }: { player: Player; color: string; onRemove: () => void }) {
  const score = calculateScore(player)
  const label = getScoreLabel(score)
  return (
    <div style={{ flex: 1, minWidth: '180px', background: '#111827', borderRadius: '12px', padding: '20px', border: `1px solid ${color}44`, position: 'relative' }}>
      <button onClick={onRemove} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 2 }}>
        <X size={14} />
      </button>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
        {initials(player.name)}
      </div>
      <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 4px', color: 'white', paddingRight: '20px' }}>{player.name}</p>
      <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 10px' }}>{player.team} · {player.competition}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ background: '#1f2937', color, fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>{player.primary_position}</span>
        <span style={{ fontSize: '20px', fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>{label}</span>
      </div>
    </div>
  )
}

function PlayerSearchBox({ onSelect, existingIds }: { onSelect: (id: string) => void; existingIds: string[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [open, setOpen] = useState(false)
  const [dq, setDq] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDq(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!dq.trim()) { setResults([]); return }
    supabase.from('players').select('id, name, team, primary_position, scout_score, individual_stats')
      .ilike('name', `%${dq}%`).limit(6)
      .then(({ data }) => setResults((data as Player[]) ?? []))
  }, [dq])

  return (
    <div style={{ position: 'relative', maxWidth: '360px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#111827', borderRadius: '10px', padding: '10px 14px' }}>
        <Search size={15} color="#6b7280" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ajouter un joueur…"
          style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '14px', flex: 1 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#1f2937', borderRadius: '10px', zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {results.map(p => {
            const already = existingIds.includes(p.id)
            return (
              <div
                key={p.id}
                onMouseDown={() => { if (!already) { onSelect(p.id); setQuery(''); setOpen(false) } }}
                style={{ padding: '10px 14px', cursor: already ? 'default' : 'pointer', opacity: already ? 0.4 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151' }}
                onMouseEnter={e => { if (!already) (e.currentTarget as HTMLDivElement).style.background = '#374151' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div>
                  <span style={{ fontWeight: 500, color: 'white', fontSize: '13px' }}>{p.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}> · {p.team}</span>
                </div>
                <span style={{ background: '#0f172a', color: '#3b82f6', fontSize: '11px', padding: '2px 7px', borderRadius: '4px' }}>{p.primary_position}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Compare() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const { limits } = usePlan()

  const ids = (['p1', 'p2', 'p3'] as const)
    .map(k => searchParams.get(k))
    .filter(Boolean) as string[]

  // Fetch players whenever URL IDs change
  useEffect(() => {
    if (ids.length === 0) { setPlayers([]); return }
    setLoading(true)
    supabase.from('players').select('*').in('id', ids)
      .then(({ data }) => {
        const sorted = ids
          .map(id => (data ?? []).find(p => p.id === id))
          .filter(Boolean) as Player[]
        setPlayers(sorted)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  function removePlayer(id: string) {
    const newIds = ids.filter(x => x !== id)
    const p = new URLSearchParams()
    newIds.forEach((v, i) => p.set(`p${i + 1}`, v))
    setSearchParams(p, { replace: true })
  }

  function addPlayer(id: string) {
    if (ids.length >= limits.maxCompare || ids.includes(id)) return
    const p = new URLSearchParams(searchParams)
    p.set(`p${ids.length + 1}`, id)
    setSearchParams(p, { replace: true })
  }

  // ── Radar data ──────────────────────────────────────────────────────────────
  const radarData = RADAR_AXES.map(axis => {
    const row: Record<string, string | number> = { stat: axis }
    players.forEach((p, i) => {
      row[`p${i}`] = p.individual_stats?.[axis.toLowerCase() as keyof IndividualStats] ?? 0
    })
    return row
  })

  // ── Verdict ─────────────────────────────────────────────────────────────────
  const ranked = [...players]
    .map(p => ({ p, score: calculateScore(p) }))
    .sort((a, b) => b.score - a.score)

  const medals = ['🥇', '🥈', '🥉']

  // ── Axis breakdown (2-player) ────────────────────────────────────────────────
  const axisBreakdown = players.length >= 2
    ? RADAR_AXES.map(axis => {
        const vals = players.map(p => ({
          name: p.name,
          value: p.individual_stats?.[axis.toLowerCase() as keyof IndividualStats] ?? 0,
          color: COLORS[players.indexOf(p)],
        }))
        const max = Math.max(...vals.map(v => v.value))
        return { axis, vals, max }
      })
    : []

  return (
    <div style={{ color: 'white', maxWidth: '1440px', paddingBottom: '48px' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/players')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: 0 }}
      >
        <ArrowLeft size={16} /> Retour aux joueurs
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>Comparateur</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            {players.length > 0
              ? `${players.length} joueur${players.length > 1 ? 's' : ''} — ${ids.length < limits.maxCompare ? 'ajoutez-en ' + (limits.maxCompare - ids.length) + ' de plus (optionnel)' : 'comparaison complète'}`
              : `Sélectionnez 2 à ${limits.maxCompare} joueurs`}
          </p>
        </div>
        {ids.length < limits.maxCompare && <PlayerSearchBox onSelect={addPlayer} existingIds={ids} />}
      </div>

      {/* Upgrade banner — shown when free plan has hit the 2-player compare limit */}
      {ids.length >= limits.maxCompare && limits.maxCompare < 3 && (
        <UpgradeBanner feature="comparateur 3" />
      )}

      {/* Empty state */}
      {!loading && players.length === 0 && (
        <div style={{ background: '#111827', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Aucun joueur sélectionné.</p>
          <p style={{ color: '#374151', fontSize: '13px' }}>Utilisez la recherche ci-dessus ou les boutons "Comparer" dans la liste des joueurs.</p>
        </div>
      )}

      {loading && <p style={{ color: '#6b7280' }}>Chargement…</p>}

      {players.length >= 1 && !loading && (
        <>
          {/* ── Player cards ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {players.map((p, i) => (
              <PlayerCard key={p.id} player={p} color={COLORS[i]} onRemove={() => removePlayer(p.id)} />
            ))}
          </div>

          {players.length < 2 && (
            <div style={{ background: '#111827', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#6b7280' }}>
              Ajoutez au moins un deuxième joueur pour lancer la comparaison.
            </div>
          )}

          {players.length >= 2 && (
            <>
              {/* ── Overlapping radar ────────────────────────────────────── */}
              <div style={{ background: '#111827', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Profil radar comparé</p>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="#1f2937" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    {players.map((p, i) => (
                      <Radar
                        key={p.id}
                        name={p.name}
                        dataKey={`p${i}`}
                        fill={COLORS[i]}
                        fillOpacity={0.15}
                        stroke={COLORS[i]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[i], r: 3 }}
                      />
                    ))}
                    <Legend
                      formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '13px' }}>{value}</span>}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Stats table ──────────────────────────────────────────── */}
              <div style={{ background: '#111827', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Comparaison statistique</p>
                {STAT_SECTIONS.map(section => (
                  <div key={section.label} style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '11px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>{section.label}</p>
                    {section.stats.map(({ label, key, fmt }) => {
                      const vals = players.map(p => getStatValue(p, key))
                      const maxVal = Math.max(...vals)
                      const allZero = maxVal === 0
                      return (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${players.length}, 1fr)`, gap: '12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>{label}</span>
                          {vals.map((val, i) => {
                            const isWinner = !allZero && val === maxVal
                            const color = COLORS[i]
                            const barWidth = allZero ? 0 : (val / maxVal) * 100
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, background: '#0f172a', borderRadius: '999px', height: '5px' }}>
                                  <div style={{ background: isWinner ? color : color + '55', width: `${barWidth}%`, height: '5px', borderRadius: '999px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: isWinner ? 700 : 400, color: isWinner ? color : '#9ca3af', minWidth: '38px', textAlign: 'right' }}>
                                  {fmt ? fmt(val) : val === 0 ? '—' : String(val)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* ── Axis breakdown (visual) ───────────────────────────────── */}
              <div style={{ background: '#111827', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Axes individuels</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {axisBreakdown.map(({ axis, vals, max }) => (
                    <div key={axis} style={{ display: 'grid', gridTemplateColumns: `120px repeat(${players.length}, 1fr)`, gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{axis}</span>
                      {vals.map(({ name, value, color }) => {
                        const isWinner = value === max && max > 0
                        return (
                          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, background: '#0f172a', borderRadius: '999px', height: '6px' }}>
                              <div style={{ background: isWinner ? color : color + '44', width: max > 0 ? `${(value / max) * 100}%` : '0%', height: '6px', borderRadius: '999px' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: isWinner ? color : '#6b7280', fontWeight: isWinner ? 700 : 400, minWidth: '28px' }}>{value}</span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Verdict ──────────────────────────────────────────────── */}
              <div style={{ background: '#111827', borderRadius: '16px', padding: '24px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Verdict</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {ranked.map(({ p, score }, rank) => {
                    const color = COLORS[players.indexOf(p)]
                    const label = getScoreLabel(score)
                    const role = ROLE_MAP[p.primary_position] || p.primary_position
                    // Find strongest axes for this player
                    const topAxes = RADAR_AXES
                      .map(axis => ({ axis, value: p.individual_stats?.[axis.toLowerCase() as keyof IndividualStats] ?? 0 }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 2)
                      .map(x => x.axis)

                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: rank === 0 ? color + '11' : '#0f172a', borderRadius: '12px', border: rank === 0 ? `1px solid ${color}33` : '1px solid #1f2937' }}>
                        <span style={{ fontSize: '24px', flexShrink: 0 }}>{medals[rank]}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: rank === 0 ? color : 'white' }}>{p.name}</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color }}>{score}</span>
                            <span style={{ background: color + '22', color, fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>{label}</span>
                          </div>
                          <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 4px' }}>
                            Forces : <span style={{ color: 'white' }}>{topAxes.join(' · ')}</span>
                          </p>
                          {rank === 0 && (
                            <p style={{ color: color, fontSize: '13px', fontWeight: 600, margin: '4px 0 0' }}>
                              ✓ Recommandé pour : {role}
                              {ranked.length > 1 && ` (+${score - ranked[1].score} pts vs ${ranked[1].p.name.split(' ')[0]})`}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
