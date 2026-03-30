import type { TrendInfo } from '../utils/trend'

interface TrendBadgeProps {
  trend?: TrendInfo
  scores?: number[]
  size?: 'sm' | 'md'
}

export function TrendBadge({ trend, size = 'sm' }: TrendBadgeProps) {
  if (!trend || trend.type === 'stable') return null

  const pad    = size === 'md' ? '3px 10px' : '1px 6px'
  const fSize  = size === 'md' ? '11px' : '9px'

  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            '3px',
      padding:        pad,
      borderRadius:   '5px',
      background:     `${trend.color}14`,
      border:         `1px solid ${trend.color}30`,
      color:          trend.color,
      fontFamily:     'var(--font-mono)',
      fontSize:       fSize,
      fontWeight:     700,
      whiteSpace:     'nowrap',
      flexShrink:     0,
    }}>
      {trend.emoji} {trend.label}
    </span>
  )
}
