import { useEffect, useState } from 'react'

type Phase = 'enter' | 'glow' | 'exit'

interface Props { onDone: () => void }

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('glow'), 700)
    const t2 = setTimeout(() => setPhase('exit'), 1600)
    const t3 = setTimeout(() => onDone(), 2100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      backgroundColor: '#0A0E1B',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      opacity: phase === 'exit' ? 0 : 1,
      transition: phase === 'exit' ? 'opacity 0.5s ease' : 'none',
    }}>

      {/* ICÔNE ÉCLAIR */}
      <div style={{
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: '#0D1525',
        border: '1px solid rgba(0,200,150,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: phase === 'enter' ? 'scale(0.3)' : 'scale(1)',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease',
        boxShadow: phase === 'glow'
          ? '0 0 30px rgba(0,200,150,0.4), 0 0 60px rgba(0,200,150,0.2)'
          : '0 0 10px rgba(0,200,150,0.1)',
      }}>
        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="36,4 18,32 30,32 24,56 46,28 33,28"
            fill="#00C896"
            style={{
              filter: phase === 'glow'
                ? 'drop-shadow(0 0 8px #00C896)'
                : 'none',
            }}
          />
        </svg>
      </div>

      {/* NOM */}
      <div style={{
        fontFamily: 'Syne, system-ui, -apple-system, sans-serif',
        fontSize: 36,
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color: '#E2EAF4',
        opacity: phase === 'enter' ? 0 : 1,
        transform: phase === 'enter' ? 'translateY(16px)' : 'translateY(0)',
        transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
      }}>
        VIZ<span style={{ color: '#00C896' }}>ION</span>
      </div>

      {/* TAGLINE */}
      <div style={{
        fontFamily: 'JetBrains Mono, Menlo, monospace',
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color: '#4A5568',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'opacity 0.6s ease 0.55s',
      }}>
        Scouting Intelligence
      </div>

      {/* BARRE BAS */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #00C896, #4D7FFF)',
          borderRadius: '0 2px 2px 0',
          width: phase === 'enter' ? '10%' : phase === 'glow' ? '65%' : '100%',
          transition: 'width 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }} />
      </div>
    </div>
  )
}
