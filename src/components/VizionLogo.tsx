import { Zap } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const CONFIG = {
  sm: { zapSize: 13, fontSize: '14px', fontWeight: 700, gap: '5px' },
  md: { zapSize: 16, fontSize: '18px', fontWeight: 800, gap: '8px' },
  lg: { zapSize: 20, fontSize: '22px', fontWeight: 800, gap: '8px' },
} as const

export default function VizionLogo({ size = 'md' }: Props) {
  const { zapSize, fontSize, fontWeight, gap } = CONFIG[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <Zap size={zapSize} color="#00C896" fill="#00C896" />
      <span style={{
        fontSize,
        fontWeight,
        color: '#E2EAF4',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        VIZION
      </span>
    </div>
  )
}
