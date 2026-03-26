import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { getScoreLabel } from '../utils/scoring'
import type { SimilarPlayer } from '../utils/similarity'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// Similarity bar color: green → yellow → red
function similarityColor(pct: number): string {
  if (pct >= 80) return '#00C896'
  if (pct >= 65) return '#4D7FFF'
  if (pct >= 50) return '#F5A623'
  return '#9B6DFF'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  similar: SimilarPlayer[]
  loading: boolean
}

export default function SimilarPlayers({ similar, loading }: Props) {
  const navigate = useNavigate()

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '14px',
      padding: '24px',
      marginBottom: '20px',
    }}>
      {/* Header */}
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: '20px', margin: '0 0 20px',
      }}>
        Profils similaires
      </p>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Recherche…
        </div>
      )}

      {/* Empty */}
      {!loading && similar.length === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          <p style={{ marginBottom: '4px' }}>Aucun joueur similaire trouvé.</p>
          <p style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>
            Données insuffisantes ou poste trop rare.
          </p>
        </div>
      )}

      {/* Cards grid */}
      {!loading && similar.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '12px',
        }}>
          {similar.map(({ player, similarity }) => {
            const label = getScoreLabel(player.scout_score)
            const color = LABEL_COLOR[label] ?? '#4A5A70'
            const simColor = similarityColor(similarity)

            return (
              <button
                key={player.id}
                onClick={() => navigate(`/players/${player.id}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(77,127,255,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(77,127,255,0.25)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Top row: avatar + name + position */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: avatarGradient(player.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: 'white',
                  }}>
                    {initials(player.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: '13px', fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {player.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                      {player.primary_position} · {player.team}
                    </p>
                  </div>
                </div>

                {/* Score + label */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '22px', fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: color,
                  }}>
                    {player.scout_score}
                  </span>
                  <span style={{
                    fontSize: '9px', fontWeight: 800, color,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    borderRadius: '4px', padding: '2px 7px',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                  }}>
                    {label}
                  </span>
                </div>

                {/* Similarity bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Similarité
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: simColor, fontFamily: 'var(--font-mono)' }}>
                      {similarity}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '4px',
                      width: `${similarity}%`,
                      background: simColor,
                      borderRadius: '999px',
                      boxShadow: `0 0 6px ${simColor}80`,
                      transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
