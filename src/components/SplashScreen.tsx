import { useEffect, useState } from 'react'

type Phase = 'enter' | 'glow' | 'exit'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('glow'), 600)
    const t2 = setTimeout(() => setPhase('exit'), 1400)
    const t3 = setTimeout(onDone, 1900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onDone])

  const isEnter = phase === 'enter'
  const isGlow  = phase === 'glow'
  const isExit  = phase === 'exit'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#0A0E1B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        opacity: isExit ? 0 : 1,
        transition: isExit ? 'opacity 0.5s ease' : 'none',
        pointerEvents: isExit ? 'none' : 'auto',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 22,
          background: '#0D1525',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isEnter ? 'scale(0.5)' : 'scale(1)',
          opacity: isEnter ? 0 : 1,
          filter: isGlow
            ? 'drop-shadow(0 0 24px #00C896) drop-shadow(0 0 48px rgba(0,200,150,0.4))'
            : 'drop-shadow(0 0 8px rgba(0,200,150,0.2))',
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, filter 0.6s ease',
        }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <polygon
            points="33,4 18,30 28,30 23,52 42,26 31,26"
            fill="#00C896"
          />
        </svg>
      </div>

      {/* Name */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#E2EAF4',
          opacity: isEnter ? 0 : 1,
          transform: isEnter ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
        }}
      >
        VIZ<span style={{ color: '#00C896' }}>ION</span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: '#5A7090',
          textTransform: 'uppercase',
          opacity: isEnter ? 0 : 1,
          transition: 'opacity 0.5s ease 0.5s',
        }}
      >
        Football Scouting Intelligence
      </div>

      {/* Progress bar */}
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
            width: isEnter ? '0%' : isGlow ? '70%' : '100%',
            transition: 'width 1.4s ease',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    </div>
  )
}
