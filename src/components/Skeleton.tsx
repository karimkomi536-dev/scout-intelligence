const SHIMMER_STYLE = `
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
`

const baseShimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite linear',
  borderRadius: '6px',
}

export function SkeletonText({ width = '100%', height = '12px' }: { width?: string; height?: string }) {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ ...baseShimmer, width, height }} />
    </>
  )
}

export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ ...baseShimmer, width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
    </>
  )
}

export function SkeletonCard() {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#0D1525',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '14px 16px',
      }}>
        {/* Avatar */}
        <SkeletonAvatar size={48} />

        {/* Lines */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SkeletonText width="55%" height="14px" />
          <SkeletonText width="75%" height="10px" />
          <SkeletonText width="40%" height="8px" />
        </div>

        {/* Score circle placeholder */}
        <div style={{ ...baseShimmer, width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
      </div>
    </>
  )
}
