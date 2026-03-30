import { usePercentile } from '../hooks/usePercentile'
import { getPercentileLabel, getPercentileColor } from '../utils/percentile'

interface Props {
  playerId: string
  score: number
  position: string
  league: string
}

export default function PercentileBadge({ playerId, score, position, league }: Props) {
  const { percentile, loading, total } = usePercentile(playerId, score, position, league)

  if (loading || percentile === null) return null

  const label = getPercentileLabel(percentile)
  const color = getPercentileColor(percentile)

  return (
    <span
      title={`Meilleur que ${percentile}% des ${position} en ${league} (${total} joueurs)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        borderRadius: '4px',
        padding: '2px 8px',
      }}
    >
      {label} des {position} · {league}
    </span>
  )
}
