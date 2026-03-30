interface ScoreSparklineProps {
  scores:  number[]
  width?:  number
  height?: number
}

export function ScoreSparkline({ scores, width = 48, height = 20 }: ScoreSparklineProps) {
  if (scores.length < 2) return null

  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1

  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * width
    const y = height - ((s - min) / range) * (height - 2) - 1
    return `${x},${y}`
  })

  const first = scores[0]
  const last  = scores[scores.length - 1]
  const color = last > first + 1 ? '#00C896' : last < first - 1 ? '#ef4444' : '#4A5A70'

  return (
    <svg
      width={width}
      height={height}
      style={{ flexShrink: 0, overflow: 'visible' }}
      aria-hidden="true"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
      />
      {/* Last point dot */}
      <circle
        cx={width}
        cy={Number(pts[pts.length - 1].split(',')[1])}
        r="2"
        fill={color}
      />
    </svg>
  )
}
