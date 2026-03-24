import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Database, BarChart2, Share2, CheckCircle, ArrowRight,
  Zap, Users,
} from 'lucide-react'
import WaitlistForm from '../components/WaitlistForm'
import { useIsMobile } from '../hooks/useIsMobile'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:      '#0A0E1B',
  surface: '#111A2E',
  sidebar: '#0D1525',
  border:  'rgba(255,255,255,0.07)',
  blue:    '#4D7FFF',
  green:   '#00C896',
  cyan:    '#22D4E8',
  purple:  '#9B6DFF',
  text:    '#E2EAF4',
  muted:   '#5A7090',
  dim:     '#2E3D52',
}

// ── Global keyframes ──────────────────────────────────────────────────────────

const STYLES = `
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes float {
    0%,100% { transform: perspective(1200px) rotateX(3deg) rotateY(-4deg) translateY(0px); }
    50%     { transform: perspective(1200px) rotateX(3deg) rotateY(-4deg) translateY(-14px); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .landing-nav-link { color: ${T.muted}; text-decoration:none; font-size:14px; font-weight:500; transition:color 0.2s; }
  .landing-nav-link:hover { color: ${T.text}; }
  .landing-feature-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
  .landing-feature-card:hover { transform: translateY(-4px); }
  .landing-pricing-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
  .landing-pricing-card:hover { transform: translateY(-6px); }
  .landing-cta-primary { transition: box-shadow 0.2s ease, transform 0.15s ease; }
  .landing-cta-primary:hover { box-shadow: 0 0 48px rgba(77,127,255,0.55) !important; transform: translateY(-1px); }
  .landing-cta-outline:hover { border-color: rgba(255,255,255,0.35) !important; color: ${T.text} !important; }
`

// ── Animated stat (IntersectionObserver + count-up) ───────────────────────────

function AnimatedStat({ target, suffix = '', label }: { target: number; suffix?: string; label: string }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true
        const start = performance.now()
        const dur = 1400
        function tick(now: number) {
          const p = Math.min((now - start) / dur, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(target * ease))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target])

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '42px', fontWeight: 700,
        color: T.text, margin: '0 0 6px',
        lineHeight: 1,
      }}>
        {value}{suffix}
      </p>
      <p style={{ fontSize: '14px', color: T.muted, margin: 0 }}>{label}</p>
    </div>
  )
}

// ── Dashboard mockup ──────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div style={{
      width: '100%',
      maxWidth: '860px',
      margin: '0 auto',
      borderRadius: '14px',
      overflow: 'hidden',
      background: T.surface,
      border: `1px solid rgba(77,127,255,0.18)`,
      boxShadow: `
        0 60px 120px rgba(0,0,0,0.65),
        0 24px 48px rgba(0,0,0,0.4),
        0 0 80px rgba(77,127,255,0.12),
        inset 0 1px 0 rgba(255,255,255,0.06)
      `,
      animation: 'float 4s ease-in-out infinite',
      display: 'flex',
      height: '420px',
    }}>

      {/* ── Mock sidebar ─────────────────────────────────────── */}
      <div style={{
        width: '180px', minWidth: '180px',
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '14px 10px',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', paddingLeft: '4px' }}>
          <Zap size={12} color={T.green} fill={T.green} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>VIZION</span>
        </div>
        {/* User card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: '7px',
          padding: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px',
          border: `1px solid ${T.border}`,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#4D7FFF,#22D4E8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '7px', fontWeight: 700, color: 'white',
          }}>SC</div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 600, color: T.text }}>scout</div>
            <div style={{ fontSize: '8px', color: T.muted }}>scout@club.fr</div>
          </div>
        </div>
        {/* Nav items */}
        {[
          { label: 'Dashboard', color: T.blue, active: true },
          { label: 'Joueurs',   color: T.muted, active: false },
          { label: 'Compare',   color: T.muted, active: false },
          { label: 'Shortlist', color: T.muted, active: false },
          { label: 'Newsletter',color: T.muted, active: false },
        ].map(({ label, color, active }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '6px 8px', borderRadius: '6px', marginBottom: '2px',
            background: active ? 'rgba(77,127,255,0.12)' : 'transparent',
            borderLeft: active ? '2px solid #4D7FFF' : '2px solid transparent',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '9.5px', fontWeight: active ? 600 : 400, color: active ? T.blue : T.muted }}>{label}</span>
          </div>
        ))}
        {/* Plan badge */}
        <div style={{
          marginTop: 'auto',
          background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.20)',
          borderRadius: '7px', padding: '7px 9px',
        }}>
          <div style={{ fontSize: '8.5px', fontWeight: 600, color: '#F5A623' }}>Plan Free</div>
          <div style={{ fontSize: '7.5px', color: T.muted }}>Passer à Pro →</div>
        </div>
      </div>

      {/* ── Mock dashboard ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          height: '40px', minHeight: '40px',
          background: T.bg, borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: T.text }}>Dashboard</span>
          <span style={{ fontFamily: 'monospace', fontSize: '9px', color: T.muted }}>mar. 24 mars</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            {[
              { n: '90', label: 'Joueurs', color: T.blue,   glow: 'rgba(77,127,255,0.30)'  },
              { n: '12', label: 'Elite',   color: T.green,  glow: 'rgba(0,200,150,0.30)'   },
              { n: '28', label: 'Prospect',color: T.blue,   glow: 'rgba(77,127,255,0.25)'  },
              { n: '18', label: 'Monitor', color: T.purple, glow: 'rgba(155,109,255,0.25)' },
            ].map(({ n, label, color, glow }) => (
              <div key={label} style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: '8px', padding: '10px 10px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '-12px', right: '-12px',
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: glow, filter: 'blur(12px)', pointerEvents: 'none',
                }} />
                <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, color, lineHeight: 1, marginBottom: '3px' }}>{n}</div>
                <div style={{ fontSize: '8px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div style={{
            flex: 1, background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '12px 14px', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 600, color: T.text }}>Distribution des talents</span>
              <span style={{
                fontFamily: 'monospace', fontSize: '8px', fontWeight: 600,
                color: T.green, background: 'rgba(0,200,150,0.12)',
                border: '1px solid rgba(0,200,150,0.25)', borderRadius: '3px', padding: '1px 5px',
              }}>LIVE</span>
            </div>
            <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="mg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00C896" stopOpacity="0.35" />
                  <stop offset="95%" stopColor="#00C896" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4D7FFF" stopOpacity="0.30" />
                  <stop offset="95%" stopColor="#4D7FFF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="mg3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F5A623" stopOpacity="0.25" />
                  <stop offset="95%" stopColor="#F5A623" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Elite area */}
              <path d="M0,75 C40,70 80,55 120,45 C160,35 200,40 240,30 C280,20 320,28 360,22 L400,20 L400,100 L0,100 Z"
                fill="url(#mg1)" />
              <path d="M0,75 C40,70 80,55 120,45 C160,35 200,40 240,30 C280,20 320,28 360,22 L400,20"
                fill="none" stroke="#00C896" strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 3px #00C896)' }} />
              {/* Prospect area */}
              <path d="M0,85 C40,80 80,70 120,65 C160,55 200,58 240,50 C280,40 320,48 360,42 L400,38 L400,100 L0,100 Z"
                fill="url(#mg2)" />
              <path d="M0,85 C40,80 80,70 120,65 C160,55 200,58 240,50 C280,40 320,48 360,42 L400,38"
                fill="none" stroke="#4D7FFF" strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 3px #4D7FFF)' }} />
              {/* Interesting area */}
              <path d="M0,92 C40,89 80,85 120,80 C160,74 200,76 240,70 C280,62 320,68 360,63 L400,60 L400,100 L0,100 Z"
                fill="url(#mg3)" />
              <path d="M0,92 C40,89 80,85 120,80 C160,74 200,76 240,70 C280,62 320,68 360,63 L400,60"
                fill="none" stroke="#F5A623" strokeWidth="1"
                style={{ filter: 'drop-shadow(0 0 3px #F5A623)' }} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ isMobile }: { isMobile: boolean }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 20px' : '0 48px',
      height: '64px',
      background: 'rgba(10,14,27,0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${T.border}`,
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={16} color={T.green} fill={T.green} />
        <span style={{ fontSize: '18px', fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
          VIZION
        </span>
      </Link>

      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#features" className="landing-nav-link">Fonctionnalités</a>
          <a href="#pricing"  className="landing-nav-link">Pricing</a>
          <Link to="/login"   className="landing-nav-link">Connexion</Link>
        </div>
      )}

      <Link to="/register" className="landing-cta-primary" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: T.blue, color: 'white',
        fontSize: '13px', fontWeight: 700,
        padding: '9px 18px', borderRadius: '8px',
        textDecoration: 'none',
        boxShadow: '0 0 24px rgba(77,127,255,0.35)',
      }}>
        Commencer
        {!isMobile && <ArrowRight size={13} />}
      </Link>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      padding: isMobile ? '100px 20px 60px' : '120px 48px 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Radial glow — top left (blue) */}
      <div style={{
        position: 'absolute', top: '-100px', left: '-100px',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(77,127,255,0.20) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Radial glow — bottom right (green) */}
      <div style={{
        position: 'absolute', bottom: '-60px', right: '-60px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,200,150,0.18) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Grid dots */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', maxWidth: '780px', animation: 'fadeUp 0.6s ease both' }}>
        {/* Shimmer badge */}
        <div style={{ marginBottom: '28px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(90deg, rgba(77,127,255,0.08) 0%, rgba(77,127,255,0.22) 30%, rgba(255,255,255,0.10) 50%, rgba(77,127,255,0.22) 70%, rgba(77,127,255,0.08) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
            border: '1px solid rgba(77,127,255,0.28)',
            borderRadius: '999px',
            padding: '6px 16px',
            fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.82)',
            letterSpacing: '0.02em',
          }}>
            🚀 Trusted by scouts in 15+ countries
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: isMobile ? 'clamp(38px, 10vw, 52px)' : 'clamp(52px, 6vw, 80px)',
          fontWeight: 900,
          lineHeight: 1.0,
          letterSpacing: '-0.03em',
          color: T.text,
          marginBottom: '20px',
        }}>
          Identifiez les talents
          <br />
          <span style={{
            background: `linear-gradient(90deg, ${T.green} 0%, ${T.cyan} 40%, ${T.blue} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            avant tout le monde
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px', lineHeight: 1.7,
          color: T.muted,
          maxWidth: '480px', margin: '0 auto 40px',
        }}>
          VIZION analyse les données de performance, score chaque joueur selon
          votre système de jeu et centralise le travail de votre staff de scouting.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px' }}>
          <Link to="/register" className="landing-cta-primary" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: T.blue, color: 'white',
            fontSize: '15px', fontWeight: 700,
            padding: '15px 30px', borderRadius: '10px',
            textDecoration: 'none',
            boxShadow: '0 0 40px rgba(77,127,255,0.45)',
          }}>
            Commencer gratuitement
            <ArrowRight size={16} />
          </Link>

          <a href="#features" className="landing-cta-outline" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '15px', fontWeight: 600,
            padding: '15px 30px', borderRadius: '10px',
            textDecoration: 'none', transition: 'border-color 0.2s, color 0.2s',
          }}>
            Voir la démo
          </a>
        </div>

        {/* Social proof */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '12px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.border}`,
          padding: '10px 20px', borderRadius: '999px',
          marginBottom: isMobile ? '48px' : '56px',
        }}>
          <div style={{ display: 'flex' }}>
            {[T.blue, T.green, '#F5A623', T.purple].map((c, i) => (
              <div key={i} style={{
                width: 26, height: 26, borderRadius: '50%',
                background: c, border: `2px solid ${T.bg}`,
                marginLeft: i > 0 ? '-8px' : 0,
              }} />
            ))}
          </div>
          <span style={{ fontSize: '13px', color: T.muted }}>
            <strong style={{ color: T.text }}>+120 clubs</strong> font confiance à VIZION
          </span>
        </div>
      </div>

      {/* Floating mockup */}
      {!isMobile && (
        <div style={{ position: 'relative', width: '100%', maxWidth: '860px', paddingBottom: '20px' }}>
          {/* Glow behind mockup */}
          <div style={{
            position: 'absolute', inset: '-40px',
            background: 'radial-gradient(ellipse at center, rgba(77,127,255,0.14) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <DashboardMockup />
        </div>
      )}
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Database, color: T.blue,
    title: 'Base intelligente',
    desc: 'Importez depuis FBref, Wyscout ou CSV. Chaque joueur est enrichi automatiquement avec ses stats de saison et son historique de transferts.',
    points: ['Import CSV / API', 'Mise à jour automatique', 'Recherche full-text avancée'],
  },
  {
    icon: BarChart2, color: T.green,
    title: 'Scoring IA',
    desc: 'Notre algorithme pondère chaque métrique selon le poste et votre système tactique. Un score unique de 0 à 100, expliqué axe par axe.',
    points: ['Pondération par position', 'Labels ELITE → LOW PRIORITY', 'Radar chart par joueur'],
  },
  {
    icon: Share2, color: T.purple,
    title: 'Collaboration',
    desc: "Shortlists collaboratives avec drag-and-drop, export PDF confidentiel, liens de partage publics. Tout votre staff sur la même page.",
    points: ['Shortlists partagées', 'Export PDF & CSV', 'Liens publics sécurisés'],
  },
]

function Features({ isMobile }: { isMobile: boolean }) {
  return (
    <section id="features" style={{
      padding: isMobile ? '80px 20px' : '120px 48px',
      maxWidth: '1200px', margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
          color: T.blue, textTransform: 'uppercase', marginBottom: '16px',
        }}>
          Fonctionnalités
        </p>
        <h2 style={{
          fontSize: isMobile ? '28px' : 'clamp(28px, 4vw, 48px)',
          fontWeight: 800, letterSpacing: '-0.02em',
          color: T.text, marginBottom: '16px',
        }}>
          Tout ce dont un staff de scouting a besoin
        </h2>
        <p style={{ color: T.muted, fontSize: '16px', maxWidth: '480px', margin: '0 auto' }}>
          Des outils pensés pour les professionnels du recrutement, pas pour les développeurs.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '24px',
      }}>
        {FEATURES.map(({ icon: Icon, color, title, desc, points }) => (
          <div key={title}
            className="landing-feature-card"
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '16px', padding: '32px',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = `${color}55`
              el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), 0 0 24px ${color}18`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = T.border
              el.style.boxShadow = 'none'
            }}
          >
            {/* Icon circle */}
            <div style={{
              width: 54, height: 54, borderRadius: '14px',
              background: `${color}18`,
              border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '22px',
              boxShadow: `0 0 24px ${color}20`,
            }}>
              <Icon size={24} color={color} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: T.text, marginBottom: '12px' }}>
              {title}
            </h3>
            <p style={{ fontSize: '14px', color: T.muted, lineHeight: 1.7, marginBottom: '22px' }}>
              {desc}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {points.map(pt => (
                <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: T.muted }}>
                  <CheckCircle size={14} color={color} style={{ flexShrink: 0 }} />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Stats ticker ──────────────────────────────────────────────────────────────

function StatsTicker({ isMobile }: { isMobile: boolean }) {
  const STATS = [
    { target: 90, suffix: '+', label: 'joueurs analysés' },
    { target: 5,  suffix: '',  label: 'ligues couvertes' },
    { target: 3,  suffix: '',  label: "formats d'export" },
  ]

  return (
    <div style={{
      borderTop: `1px solid ${T.border}`,
      borderBottom: `1px solid ${T.border}`,
      padding: isMobile ? '48px 20px' : '64px 48px',
      background: `linear-gradient(135deg, rgba(77,127,255,0.04) 0%, rgba(0,200,150,0.04) 100%)`,
    }}>
      <div style={{
        maxWidth: '800px', margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: isMobile ? '40px' : '0',
      }}>
        {STATS.map(({ target, suffix, label }, i) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            borderRight: !isMobile && i < STATS.length - 1 ? `1px solid ${T.border}` : 'none',
          }}>
            <AnimatedStat target={target} suffix={suffix} label={label} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Solo', id: 'solo',
    monthlyPrice: 'Gratuit', annualPrice: 'Gratuit',
    sub: 'Pour toujours',
    desc: 'Pour les scouts indépendants qui démarrent.',
    featured: false,
    cta: 'Commencer gratuitement', ctaTo: '/register',
    features: ['1 utilisateur', "Jusqu'à 50 joueurs", 'Shortlist personnelle', 'Export CSV', 'Score automatique'],
  },
  {
    name: 'Club Pro', id: 'pro',
    monthlyPrice: '€49', annualPrice: '€39',
    sub: '/mois',
    desc: 'Pour les staffs de recrutement qui travaillent en équipe.',
    featured: true,
    cta: "Démarrer l'essai", ctaTo: '/register',
    features: ["Jusqu'à 10 scouts", 'Joueurs illimités', 'Shortlists collaboratives', 'Export PDF & CSV', 'Score & labels avancés', 'Support prioritaire'],
  },
  {
    name: 'Enterprise', id: 'enterprise',
    monthlyPrice: 'Sur devis', annualPrice: 'Sur devis',
    sub: '',
    desc: 'Pour les clubs professionnels et agences multi-marchés.',
    featured: false,
    cta: 'Nous contacter', ctaTo: '/login',
    features: ['Scouts illimités', 'Multi-organisations', 'API & intégrations', 'SLA garanti', 'Onboarding dédié', 'Données propriétaires'],
  },
]

function Pricing({ isMobile }: { isMobile: boolean }) {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" style={{
      padding: isMobile ? '80px 20px' : '120px 48px',
      maxWidth: '1100px', margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '56px' }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
          color: T.blue, textTransform: 'uppercase', marginBottom: '16px',
        }}>
          Pricing
        </p>
        <h2 style={{
          fontSize: isMobile ? '28px' : 'clamp(28px, 4vw, 48px)',
          fontWeight: 800, letterSpacing: '-0.02em',
          color: T.text, marginBottom: '16px',
        }}>
          Simple, transparent, sans surprise
        </h2>
        <p style={{ color: T.muted, fontSize: '16px', marginBottom: '32px' }}>
          Commencez gratuitement. Passez au pro quand votre staff grandit.
        </p>

        {/* Monthly / Annual toggle */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '10px', padding: '4px', gap: '2px',
        }}>
          {[{ label: 'Mensuel', val: false }, { label: 'Annuel  −20%', val: true }].map(({ label, val }) => (
            <button
              key={label}
              onClick={() => setAnnual(val)}
              style={{
                padding: '8px 20px', borderRadius: '7px',
                border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                background: annual === val ? T.blue : 'transparent',
                color: annual === val ? 'white' : T.muted,
                transition: 'all 0.2s ease',
                boxShadow: annual === val ? '0 0 16px rgba(77,127,255,0.30)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '20px', alignItems: 'start',
      }}>
        {PLANS.map(plan => (
          <div key={plan.id}
            className="landing-pricing-card"
            style={{
              background: plan.featured
                ? 'linear-gradient(160deg, rgba(77,127,255,0.08) 0%, rgba(34,212,232,0.05) 100%)'
                : T.surface,
              border: `${plan.featured ? '2px' : '1px'} solid ${plan.featured ? `${T.blue}80` : T.border}`,
              borderRadius: '18px', padding: '32px',
              position: 'relative',
              boxShadow: plan.featured ? `0 0 48px rgba(77,127,255,0.18)` : 'none',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              if (!plan.featured) {
                el.style.borderColor = `${T.blue}50`
                el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.25), 0 0 20px rgba(77,127,255,0.10)`
              } else {
                el.style.boxShadow = `0 0 64px rgba(77,127,255,0.28)`
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              if (!plan.featured) {
                el.style.borderColor = T.border
                el.style.boxShadow = 'none'
              } else {
                el.style.boxShadow = `0 0 48px rgba(77,127,255,0.18)`
              }
            }}
          >
            {/* Popular badge */}
            {plan.featured && (
              <div style={{
                position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                background: T.blue, color: 'white',
                fontSize: '10px', fontWeight: 800, letterSpacing: '0.10em',
                padding: '4px 16px', borderRadius: '999px',
                boxShadow: '0 0 16px rgba(77,127,255,0.50)',
              }}>
                POPULAIRE
              </div>
            )}

            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
              color: plan.featured ? T.blue : T.muted,
              textTransform: 'uppercase', marginBottom: '12px',
            }}>
              {plan.name}
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '38px', fontWeight: 900, color: T.text,
                letterSpacing: '-0.02em', fontFamily: "'JetBrains Mono', monospace",
              }}>
                {annual ? plan.annualPrice : plan.monthlyPrice}
              </span>
              {plan.sub && (
                <span style={{ fontSize: '13px', color: T.muted }}>{plan.sub}</span>
              )}
            </div>
            {annual && plan.id === 'pro' && (
              <p style={{ fontSize: '11px', color: T.green, marginBottom: '0', fontFamily: 'monospace' }}>
                Économisez €120/an
              </p>
            )}

            <p style={{ fontSize: '13px', color: T.muted, margin: '12px 0 24px', lineHeight: 1.6 }}>
              {plan.desc}
            </p>

            <Link to={plan.ctaTo} style={{
              display: 'block', textAlign: 'center',
              background: plan.featured ? T.blue : 'transparent',
              border: `1px solid ${plan.featured ? T.blue : T.border}`,
              color: plan.featured ? 'white' : T.text,
              fontSize: '14px', fontWeight: 700,
              padding: '13px', borderRadius: '10px',
              textDecoration: 'none', marginBottom: '28px',
              transition: 'all 0.2s ease',
              boxShadow: plan.featured ? '0 0 24px rgba(77,127,255,0.30)' : 'none',
            }}
              onMouseEnter={e => {
                if (!plan.featured) e.currentTarget.style.borderColor = `${T.blue}60`
              }}
              onMouseLeave={e => {
                if (!plan.featured) e.currentTarget.style.borderColor = T.border
              }}
            >
              {plan.cta}
            </Link>

            <div style={{ height: '1px', background: T.border, marginBottom: '24px' }} />

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: T.muted }}>
                  <CheckCircle size={14} color={plan.featured ? T.blue : T.dim} style={{ flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Waitlist / newsletter ─────────────────────────────────────────────────────

function Waitlist({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{
      padding: isMobile ? '80px 20px' : '100px 48px',
      borderTop: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
        color: T.green, textTransform: 'uppercase', marginBottom: '16px',
      }}>
        Accès anticipé
      </p>
      <h2 style={{
        fontSize: isMobile ? '24px' : 'clamp(24px, 3.5vw, 40px)',
        fontWeight: 800, letterSpacing: '-0.02em',
        color: T.text, marginBottom: '16px', maxWidth: '520px',
      }}>
        Restez informé des nouvelles fonctionnalités
      </h2>
      <p style={{ color: T.muted, fontSize: '15px', marginBottom: '36px', maxWidth: '420px' }}>
        Inscrivez-vous pour recevoir les mises à jour produit et les offres réservées aux clubs partenaires.
      </p>
      <WaitlistForm source="landing-section" />
    </section>
  )
}

// ── CTA Final ─────────────────────────────────────────────────────────────────

function CTAFinal({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{
      margin: isMobile ? '0 12px 80px' : '0 48px 100px',
      background: `linear-gradient(135deg, rgba(77,127,255,0.12) 0%, rgba(0,200,150,0.08) 50%, rgba(155,109,255,0.08) 100%)`,
      border: `1px solid rgba(77,127,255,0.25)`,
      borderRadius: '24px',
      padding: isMobile ? '56px 28px' : '80px 48px',
      textAlign: 'center',
      boxShadow: '0 0 80px rgba(77,127,255,0.12)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', top: '-60px', left: '-60px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(77,127,255,0.15), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', right: '-60px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,200,150,0.12), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{ marginBottom: '20px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`,
            borderRadius: '999px', padding: '5px 14px',
            fontSize: '12px', fontWeight: 600, color: T.muted,
          }}>
            <Users size={11} /> Rejoignez la communauté
          </span>
        </div>

        <h2 style={{
          fontSize: isMobile ? '26px' : 'clamp(28px, 4vw, 52px)',
          fontWeight: 900, letterSpacing: '-0.03em',
          color: T.text, marginBottom: '16px',
        }}>
          Rejoignez les clubs qui recrutent mieux
        </h2>
        <p style={{
          fontSize: '16px', color: T.muted,
          maxWidth: '440px', margin: '0 auto 40px',
        }}>
          Créez votre compte en 30 secondes. Aucune carte de crédit requise.
        </p>

        <Link to="/register" className="landing-cta-primary" style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: T.blue, color: 'white',
          fontSize: '16px', fontWeight: 800,
          padding: '17px 38px', borderRadius: '12px',
          textDecoration: 'none',
          boxShadow: '0 0 48px rgba(77,127,255,0.40)',
        }}>
          Commencer gratuitement
          <ArrowRight size={18} />
        </Link>

        {/* Trust badges */}
        <div style={{
          display: 'flex', gap: isMobile ? '16px' : '32px', justifyContent: 'center',
          marginTop: '32px', flexWrap: 'wrap',
        }}>
          {['✓ Sans carte de crédit', '✓ Annulable à tout moment', '✓ RGPD compliant'].map(t => (
            <span key={t} style={{ fontSize: '12px', color: T.muted }}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({ isMobile }: { isMobile: boolean }) {
  return (
    <footer style={{
      borderTop: `1px solid ${T.border}`,
      padding: isMobile ? '32px 20px' : '40px 48px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={13} color={T.green} fill={T.green} />
        <span style={{ fontSize: '14px', fontWeight: 700, color: T.text }}>VIZION</span>
        <span style={{ fontSize: '12px', color: T.muted, marginLeft: '6px' }}>© 2026</span>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {['Confidentialité', 'CGU', 'Mentions légales', 'Contact'].map(label => (
          <a key={label} href="#" style={{
            fontSize: '13px', color: T.muted,
            textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  if (loading) return null

  return (
    <div style={{
      backgroundColor: T.bg,
      minHeight: '100vh',
      color: T.text,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      overflowX: 'hidden',
    }}>
      <style>{STYLES}</style>
      <Nav isMobile={isMobile} />
      <Hero isMobile={isMobile} />
      <Features isMobile={isMobile} />
      <StatsTicker isMobile={isMobile} />
      <Pricing isMobile={isMobile} />
      <Waitlist isMobile={isMobile} />
      <CTAFinal isMobile={isMobile} />
      <Footer isMobile={isMobile} />
    </div>
  )
}
