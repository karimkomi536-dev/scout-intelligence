import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import { usePlayerFilters } from '../hooks/usePlayerFilters'
import { useCompare } from '../contexts/CompareContext'
import type { Player } from '../types/player'

type PlayerWithScore = Player & { _score: number }

const LABEL_COLORS: Record<string, string> = {
  'ELITE':        '#10F090',
  'TOP PROSPECT': '#3b82f6',
  'INTERESTING':  '#eab308',
  'TO MONITOR':   '#f97316',
  'LOW PRIORITY': '#6b7280',
}

const POSITIONS = ['ST', 'RW', 'LW', 'CAM', 'CM', 'CDM', 'RB', 'LB', 'CB', 'GK']

const FOOT_OPTIONS = [
  { label: 'Gauche', value: 'Left' },
  { label: 'Droit',  value: 'Right' },
  { label: 'Les deux', value: '' },
]

export default function Players() {
  const navigate = useNavigate()
  const { filters, set, reset, hasActiveFilters } = usePlayerFilters()
  const { isSelected, toggle, ids: compareIds } = useCompare()

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [leagues, setLeagues] = useState<string[]>([])

  // Debounced search — fires query 300ms after user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  // Fetch available leagues once on mount
  useEffect(() => {
    supabase.from('players').select('competition').then(({ data }) => {
      const unique = [...new Set(
        (data ?? []).map(d => d.competition as string).filter(Boolean)
      )].sort()
      setLeagues(unique)
    })
  }, [])

  // Server-side filtered query — re-runs whenever any filter changes
  useEffect(() => {
    setLoading(true)

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
  // Serialize arrays to stable strings for dependency comparison
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.positions.join(','), filters.leagues.join(','),
      filters.ageMin, filters.ageMax, filters.foot, filters.minScore])

  const displayPlayers: PlayerWithScore[] = players.map(p => ({
    ...p,
    _score: calculateScore(p),
  }))

  // ── Pill toggle helper ─────────────────────────────────────────────────────
  function toggleValue(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value]
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const pillBase = (active: boolean, activeColor = '#3b82f6') => ({
    background: active ? activeColor : '#1f2937',
    color: active ? (activeColor === '#10b981' ? '#08091A' : 'white') : '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: active ? 600 : 400 as number,
    cursor: 'pointer',
  })

  const sectionLabel = {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  }

  return (
    <div style={{ color: 'white' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Players</h2>
        {hasActiveFilters && (
          <button onClick={reset} style={{ background: 'none', border: '1px solid #374151', borderRadius: '8px', color: '#9ca3af', fontSize: '13px', padding: '6px 14px', cursor: 'pointer' }}>
            Réinitialiser les filtres
          </button>
        )}
      </div>
      <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
        {loading
          ? 'Chargement…'
          : `${displayPlayers.length} joueur${displayPlayers.length !== 1 ? 's' : ''} trouvé${displayPlayers.length !== 1 ? 's' : ''}`}
      </p>

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher un joueur ou une équipe…"
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
          style={{ background: '#0f172a', border: 'none', outline: 'none', color: 'white', fontSize: '14px', padding: '10px 14px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}
        />

        {/* Row: Position + Foot + Age + Score */}
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Position pills */}
          <div>
            <p style={sectionLabel}>Position</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {POSITIONS.map(p => (
                <button key={p} style={pillBase(filters.positions.includes(p))}
                  onClick={() => set({ positions: toggleValue(filters.positions, p) })}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Foot toggle */}
          <div>
            <p style={sectionLabel}>Pied dominant</p>
            <div style={{ display: 'flex', gap: '4px' }}>
              {FOOT_OPTIONS.map(({ label, value }) => {
                const active = filters.foot === value
                return (
                  <button key={label} style={pillBase(active, '#6366f1')}
                    onClick={() => set({ foot: active && value !== '' ? '' : value })}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Age range */}
          <div>
            <p style={sectionLabel}>Tranche d'âge</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="number" min={16} max={filters.ageMax} value={filters.ageMin}
                onChange={e => set({ ageMin: Math.max(16, Math.min(Number(e.target.value), filters.ageMax)) })}
                style={{ background: '#0f172a', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', width: '52px', fontSize: '14px', textAlign: 'center', outline: 'none' }} />
              <span style={{ color: '#6b7280' }}>–</span>
              <input type="number" min={filters.ageMin} max={40} value={filters.ageMax}
                onChange={e => set({ ageMax: Math.min(40, Math.max(Number(e.target.value), filters.ageMin)) })}
                style={{ background: '#0f172a', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', width: '52px', fontSize: '14px', textAlign: 'center', outline: 'none' }} />
              <span style={{ color: '#6b7280', fontSize: '12px' }}>ans</span>
            </div>
          </div>

          {/* Min score */}
          <div>
            <p style={sectionLabel}>Score min</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="range" min={0} max={100} value={filters.minScore}
                onChange={e => set({ minScore: Number(e.target.value) })}
                style={{ accentColor: '#3b82f6', width: '100px' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '28px' }}>{filters.minScore}</span>
            </div>
          </div>
        </div>

        {/* League pills */}
        {leagues.length > 0 && (
          <div>
            <p style={sectionLabel}>Championnat</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {leagues.map(league => (
                <button key={league} style={pillBase(filters.leagues.includes(league), '#10b981')}
                  onClick={() => set({ leagues: toggleValue(filters.leagues, league) })}>
                  {league}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Chargement…</p>
      ) : displayPlayers.length === 0 ? (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '12px' }}>Aucun joueur ne correspond à ces filtres.</p>
          {hasActiveFilters && (
            <button onClick={reset} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: '#111827', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1f2937' }}>
                <th style={{ textAlign: 'left', padding: '14px 24px' }}>Joueur</th>
                <th style={{ textAlign: 'left', padding: '14px 12px' }}>Âge</th>
                <th style={{ textAlign: 'left', padding: '14px 12px' }}>Équipe</th>
                <th style={{ textAlign: 'left', padding: '14px 12px' }}>Poste</th>
                <th style={{ textAlign: 'left', padding: '14px 12px' }}>Championnat</th>
                <th style={{ textAlign: 'left', padding: '14px 12px' }}>Score</th>
                <th style={{ textAlign: 'left', padding: '14px 12px' }}>Label</th>
                <th style={{ padding: '14px 12px', width: '44px' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayPlayers.map(player => {
                const label = getScoreLabel(player._score)
                const labelColor = LABEL_COLORS[label] || '#6b7280'
                return (
                  <tr key={player.id}
                    onClick={() => navigate(`/players/${player.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderBottom: '1px solid #1f2937', cursor: 'pointer' }}>
                    <td style={{ padding: '14px 24px', fontWeight: 500 }}>{player.name}</td>
                    <td style={{ padding: '14px 12px', color: '#9ca3af' }}>{player.age ?? '—'}</td>
                    <td style={{ padding: '14px 12px', color: '#9ca3af' }}>{player.team}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ background: '#0f172a', color: '#3b82f6', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px' }}>
                        {player.primary_position}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', color: '#9ca3af' }}>{player.competition}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '56px', background: '#0f172a', borderRadius: '999px', height: '5px' }}>
                          <div style={{ background: '#3b82f6', width: `${player._score}%`, height: '5px', borderRadius: '999px' }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{player._score}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ background: `${labelColor}22`, color: labelColor, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '4px' }}>
                        {label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => compareIds.length < 3 || isSelected(player.id) ? toggle(player.id) : undefined}
                        title={isSelected(player.id) ? 'Retirer du comparateur' : compareIds.length >= 3 ? 'Max 3 joueurs' : 'Ajouter au comparateur'}
                        style={{ background: 'none', border: 'none', cursor: compareIds.length >= 3 && !isSelected(player.id) ? 'not-allowed' : 'pointer', color: isSelected(player.id) ? '#10F090' : '#374151', opacity: compareIds.length >= 3 && !isSelected(player.id) ? 0.4 : 1, padding: 2 }}
                      >
                        {isSelected(player.id) ? <CheckCircle size={16} /> : <PlusCircle size={16} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
