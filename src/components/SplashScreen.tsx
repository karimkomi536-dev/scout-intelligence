import { useEffect, useState } from 'react'

type Phase = 'enter' | 'glow' | 'exit'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    // Phase 1 : éclair apparaît (0 → 600 ms)
    const t1 = setTimeout(() => setPhase('glow'), 600)
    // Phase 2 : glow pulsé (600 → 1400 ms)
    const t2 = setTimeout(() => setPhase('exit'), 1400)
    // Phase 3 : fondu sortie (1400 → 1900 ms) puis unmount
    const t3 = setTimeout(onDone, 1900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0A0E1B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.5s ease' : 'none',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      {/* ── Éclair SVG animé ────────────────────────────────── */}
      <div
        style={{
          transform: phase === 'enter' ? 'scale(0.5)' : 'scale(1)',
          opacity:   phase === 'enter' ? 0 : 1,
          filter:
            phase === 'glow'
              ? 'drop-shadow(0 0 24px #00C896) drop-shadow(0 0 48px rgba(0,200,150,0.4))'
              : 'drop-shadow(0 0 8px rgba(0,200,150,0.3))',
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, filter 0.6s ease',
        }}
      >
        <svg width="80" height="80" viewBox="0 0 192 192">
          <rect width="192" height="192" rx="40" fill="#0D1525" />
          <polygon
            points="112,20 60,105 95,105 80,172 140,87 105,87"
            fill="#00C896"
          />
        </svg>
      </div>

      {/* ── Nom VIZION ──────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#E2EAF4',
          opacity:   phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
        }}
      >
        VIZ<span style={{ color: '#00C896' }}>ION</span>
      </div>

      {/* ── Tagline ─────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: '#5A7090',
          textTransform: 'uppercase',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 0.5s ease 0.5s',
        }}
      >
        Football Scouting Intelligence
      </div>

      {/* ── Barre de chargement ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #00C896, #4D7FFF)',
            width: phase === 'enter' ? '0%' : phase === 'glow' ? '70%' : '100%',
            transition: 'width 1.4s ease',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    </div>
  )
}
