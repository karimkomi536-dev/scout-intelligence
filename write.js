const fs = require('fs')

fs.writeFileSync('src/pages/Players.tsx', `
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const labelColors = {
  'ELITE': '#3b82f6',
  'TOP PROSPECT': '#22c55e',
  'INTERESTING': '#eab308',
  'TO MONITOR': '#f97316',
  'LOW PRIORITY': '#6b7280'
}

export default function Players() {
  const [players, setPlayers] = useState([])
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState('ALL')
  const [minScore, setMinScore] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('players').select('*').then(({ data }) => {
      setPlayers(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) &&
    (pos === 'ALL' || p.primary_position === pos) &&
    (p.scout_score || 0) >= minScore
  )

  return (
    <div style={{ color: 'white' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Players</h2>
      <p style={{ color: '#9ca3af', marginBottom: '24px' }}>{filtered.length} players found</p>

      <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search player or team..."
          style={{ background: '#1f2937', border: 'none', outline: 'none', color: 'white', fontSize: '14px', padding: '8px 12px', borderRadius: '8px', flex: 1 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ background: '#1f2937', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px' }} value={pos} onChange={e => setPos(e.target.value)}>
          {['ALL', 'ST', 'RW', 'LW', 'CM', 'CAM', 'CB', 'LB', 'RB', 'GK'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>Min Score</span>
          <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ accentColor: '#3b82f6' }} />
          <span style={{ fontSize: '12px' }}>{minScore}</span>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading players...</p>
      ) : (
        <div style={{ background: '#111827', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ color: '#9ca3af', fontSize: '12px', borderBottom: '1px solid #1f2937' }}>
                <th style={{ textAlign: 'left', padding: '16px 24px' }}>PLAYER</th>
                <th style={{ textAlign: 'left', padding: '16px' }}>AGE</th>
                <th style={{ textAlign: 'left', padding: '16px' }}>TEAM</th>
                <th style={{ textAlign: 'left', padding: '16px' }}>POSITION</th>
                <th style={{ textAlign: 'left', padding: '16px' }}>COMPETITION</th>
                <th style={{ textAlign: 'left', padding: '16px' }}>SCOUT SCORE</th>
                <th style={{ textAlign: 'left', padding: '16px' }}>LABEL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(player => (
                <tr key={player.id} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>{player.name}</td>
                  <td style={{ padding: '16px', color: '#9ca3af' }}>{player.age}</td>
                  <td style={{ padding: '16px', color: '#9ca3af' }}>{player.team}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: '#1f2937', color: '#3b82f6', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>{player.primary_position}</span>
                  </td>
                  <td style={{ padding: '16px', color: '#9ca3af' }}>{player.competition}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '64px', background: '#1f2937', borderRadius: '999px', height: '6px' }}>
                        <div style={{ background: '#3b82f6', width: (player.scout_score || 0) + '%', height: '6px', borderRadius: '999px' }} />
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{player.scout_score}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: labelColors[player.scout_label] || '#6b7280', color: 'white', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>{player.scout_label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
`)

console.log('Players.tsx written!')
