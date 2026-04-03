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

export function SkeletonKPI() {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ ...baseShimmer, height: 90, borderRadius: 10 }} />
    </>
  )
}

export function SkeletonPlayerHeader() {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ display: 'flex', gap: 20, padding: '20px 0' }}>
        <div style={{ ...baseShimmer, width: 72, height: 72, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...baseShimmer, height: 24, width: '40%' }} />
          <div style={{ ...baseShimmer, height: 16, width: '60%' }} />
        </div>
      </div>
    </>
  )
}

export function SkeletonRadar() {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ ...baseShimmer, width: '100%', height: 280, borderRadius: 10 }} />
    </>
  )
}

export function SkeletonShortlistGroup() {
  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ ...baseShimmer, height: 20, width: '30%', marginBottom: 12 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ ...baseShimmer, height: 48, marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
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
