import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    console.log('[VIZION] SplashScreen mounted')

    const t0 = setTimeout(() => setAnimate(true), 50)
    const t1 = setTimeout(() => setVisible(false), 1800)
    const t2 = setTimeout(() => {
      console.log('[VIZION] SplashScreen done')
      onDone()
    }, 2300)

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [])

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
        transition: 'opacity 0.5s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
      }}
    >
      {/* Icône éclair */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 22,
          background: '#0D1525',
          border: '1px solid rgba(0,200,150,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, box-shadow 0.4s ease',
          transform: animate ? 'scale(1)' : 'scale(0.3)',
          opacity: animate ? 1 : 0,
          boxShadow: animate
            ? '0 0 30px rgba(0,200,150,0.35), 0 0 60px rgba(0,200,150,0.15)'
            : 'none',
        }}
      >
        <svg width="54" height="54" viewBox="0 0 192 192">
          <polygon
            points="112,20 60,105 95,105 80,172 140,87 105,87"
            fill="#00C896"
          />
        </svg>
      </div>

      {/* Titre */}
      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#E2EAF4',
          fontFamily: 'Syne, system-ui, sans-serif',
          transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
          opacity: animate ? 1 : 0,
          transform: animate ? 'translateY(0)' : 'translateY(14px)',
        }}
      >
        VIZ<span style={{ color: '#00C896' }}>ION</span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#4A5568',
          fontFamily: 'JetBrains Mono, monospace',
          transition: 'opacity 0.5s ease 0.55s',
          opacity: animate ? 1 : 0,
        }}
      >
        Scouting Intelligence
      </div>

      {/* Barre de progression */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #00C896, #4D7FFF)',
            borderRadius: '0 2px 2px 0',
            transition: 'width 1.8s ease',
            width: animate ? '100%' : '5%',
          }}
        />
      </div>
    </div>
  )
}
