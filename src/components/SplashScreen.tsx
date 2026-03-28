import { useEffect, useState } from 'react'

type Phase = 'enter' | 'glow' | 'punch' | 'exit'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('enter')
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    console.log('[VIZION] SplashScreen mounted')
    const t0 = setTimeout(() => setAnimate(true), 50)
    const t1 = setTimeout(() => setPhase('glow'), 600)
    const t2 = setTimeout(() => setPhase('punch'), 1400)
    const t3 = setTimeout(() => setPhase('exit'), 1750)
    const t4 = setTimeout(() => onDone(), 2100)
    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2)
      clearTimeout(t3); clearTimeout(t4)
    }
  }, [])

  const isPunch = phase === 'punch'
  const isExit  = phase === 'exit'
  const isEnter = !animate

  const iconScale = isEnter ? 0.3 : isPunch || isExit ? 12 : 1

  const iconShadow = phase === 'glow'
    ? '0 0 40px rgba(0,200,150,0.6), 0 0 80px rgba(0,200,150,0.3)'
    : isPunch
    ? '0 0 80px rgba(0,200,150,0.9), 0 0 160px rgba(0,200,150,0.5)'
    : 'none'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: '#0A0E1B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        overflow: 'hidden',
        opacity: isExit ? 0 : 1,
        transition: isExit ? 'opacity 0.35s ease' : 'none',
        pointerEvents: isExit ? 'none' : 'all',
      }}
    >
      {/* FOND qui flashe au moment du punch */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: '#0A0E1B',
        opacity: isPunch ? 1 : 0,
        transition: isPunch ? 'opacity 0.1s ease' : 'opacity 0.3s ease',
        zIndex: 0,
      }} />

      {/* ICÔNE ÉCLAIR */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: 96,
          height: 96,
          borderRadius: isPunch || isExit ? 8 : 22,
          background: '#0D1525',
          border: isPunch
            ? '1px solid rgba(0,200,150,0.6)'
            : '1px solid rgba(0,200,150,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${iconScale})`,
          opacity: isEnter ? 0 : 1,
          boxShadow: iconShadow,
          transition: isPunch || isExit
            ? 'transform 0.35s cubic-bezier(0.55, 0, 1, 0.45), box-shadow 0.2s ease, border-radius 0.35s ease'
            : 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        <svg width="54" height="54" viewBox="0 0 192 192">
          <polygon
            points="112,20 60,105 95,105 80,172 140,87 105,87"
            fill="#00C896"
            style={{
              filter: phase === 'glow' || isPunch
                ? 'drop-shadow(0 0 8px #00C896)'
                : 'none',
              transition: 'filter 0.3s ease',
            }}
          />
        </svg>
      </div>

      {/* TITRE — disparaît au punch */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#E2EAF4',
          fontFamily: 'Syne, system-ui, sans-serif',
          opacity: isEnter ? 0 : isPunch || isExit ? 0 : 1,
          transform: isEnter
            ? 'translateY(14px)'
            : isPunch ? 'translateY(-20px) scale(0.8)' : 'translateY(0)',
          transition: isPunch
            ? 'opacity 0.2s ease, transform 0.2s ease'
            : 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
        }}
      >
        VIZ<span style={{ color: '#00C896' }}>ION</span>
      </div>

      {/* TAGLINE — disparaît au punch */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase' as const,
          color: '#4A5568',
          fontFamily: 'JetBrains Mono, monospace',
          opacity: isEnter ? 0 : isPunch || isExit ? 0 : 1,
          transition: isPunch
            ? 'opacity 0.15s ease'
            : 'opacity 0.5s ease 0.55s',
        }}
      >
        Scouting Intelligence
      </div>

      {/* BARRE DE PROGRESSION */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 3,
        background: 'rgba(255,255,255,0.05)',
        zIndex: 2,
        opacity: isPunch || isExit ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #00C896, #4D7FFF)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 1.5s ease',
          width: !animate ? '5%' : isPunch || isExit ? '100%' : '70%',
        }} />
      </div>
    </div>
  )
}
