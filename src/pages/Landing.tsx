import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Database, BarChart2, Share2,
  CheckCircle, ArrowRight, Zap, Shield, Users
} from 'lucide-react'

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:        '#08091A',
  bgCard:    '#0d1127',
  bgCardAlt: '#111827',
  border:    '#1a2040',
  green:     '#10F090',
  greenDim:  'rgba(16,240,144,0.12)',
  greenGlow: 'rgba(16,240,144,0.25)',
  text:      '#ffffff',
  muted:     '#8892a4',
  mutedDark: '#4b5563',
}

// ─── Reusable atoms ─────────────────────────────────────────────────────────
const GreenBadge = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: C.greenDim, border: `1px solid ${C.green}`,
    color: C.green, fontSize: '12px', fontWeight: '600',
    padding: '4px 12px', borderRadius: '999px', letterSpacing: '0.04em',
  }}>
    {children}
  </span>
)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em',
    color: C.green, textTransform: 'uppercase', marginBottom: '16px',
  }}>
    {children}
  </p>
)

// ─── Nav ────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: '64px',
      background: 'rgba(8,9,26,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>⚽</span>
        <span style={{ fontSize: '18px', fontWeight: '800', color: C.text, letterSpacing: '-0.02em' }}>
          VIZ<span style={{ color: C.green }}>ION</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        {[
          { label: 'Fonctionnalités', href: '#features' },
          { label: 'Pricing',         href: '#pricing' },
        ].map(({ label, href }) => (
          <a key={label} href={href} style={{
            color: C.muted, fontSize: '14px', fontWeight: '500',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            {label}
          </a>
        ))}

        <Link to="/login" style={{
          color: C.muted, fontSize: '14px', fontWeight: '500',
          textDecoration: 'none', transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
        >
          Connexion
        </Link>

        <Link to="/register" style={{
          background: C.green, color: '#08091A',
          fontSize: '13px', fontWeight: '700',
          padding: '8px 18px', borderRadius: '8px',
          textDecoration: 'none', transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Commencer gratuitement
        </Link>
      </div>
    </nav>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      padding: '120px 24px 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: `radial-gradient(ellipse at center, ${C.greenGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Grid lines decoration */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        opacity: 0.3,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: '800px' }}>
        <div style={{ marginBottom: '24px' }}>
          <GreenBadge>
            <Zap size={11} />
            IA de scouting football
          </GreenBadge>
        </div>

        <h1 style={{
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: '900',
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: C.text,
          marginBottom: '24px',
        }}>
          Identifiez les talents{' '}
          <span style={{
            color: C.green,
            textShadow: `0 0 40px ${C.greenGlow}`,
          }}>
            avant tout le monde
          </span>
        </h1>

        <p style={{
          fontSize: '18px', lineHeight: 1.7,
          color: C.muted, marginBottom: '40px',
          maxWidth: '560px', margin: '0 auto 40px',
        }}>
          VIZION analyse les données de performance, score chaque joueur selon
          votre système de jeu et centralise le travail de votre staff de scouting
          en temps réel.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '56px' }}>
          <Link to="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: C.green, color: '#08091A',
            fontSize: '15px', fontWeight: '700',
            padding: '14px 28px', borderRadius: '10px',
            textDecoration: 'none', transition: 'opacity 0.2s',
            boxShadow: `0 0 32px ${C.greenGlow}`,
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Essai gratuit
            <ArrowRight size={16} />
          </Link>

          <a href="#features" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.text,
            fontSize: '15px', fontWeight: '600',
            padding: '14px 28px', borderRadius: '10px',
            textDecoration: 'none', transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.green)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
          >
            Voir les fonctionnalités
          </a>
        </div>

        {/* Social proof badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '12px',
          background: C.bgCard, border: `1px solid ${C.border}`,
          padding: '10px 20px', borderRadius: '999px',
        }}>
          <div style={{ display: 'flex' }}>
            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444'].map((c, i) => (
              <div key={i} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: c, border: '2px solid #08091A',
                marginLeft: i > 0 ? '-8px' : 0,
              }} />
            ))}
          </div>
          <span style={{ fontSize: '13px', color: C.muted }}>
            <strong style={{ color: C.text }}>+120 clubs</strong> font confiance à VIZION
          </span>
        </div>
      </div>
    </section>
  )
}

// ─── Features ────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Database,
    title: 'Base joueurs intelligente',
    desc: 'Importez vos données depuis FBref, Wyscout ou CSV. Chaque joueur est enrichi automatiquement avec ses statistiques de saison et son historique.',
    points: ['Import CSV / API', 'Mise à jour automatique', 'Recherche full-text'],
  },
  {
    icon: BarChart2,
    title: 'Scoring par position',
    desc: 'Notre algorithme pondère chaque métrique selon le poste et votre système tactique. Un score unique de 0 à 100 par joueur, expliqué.',
    points: ['Pondération tactique', 'Labels ELITE → LOW PRIORITY', 'Comparaison de cohortes'],
  },
  {
    icon: Share2,
    title: 'Export & Collaboration',
    desc: 'Partagez des shortlists avec votre direction sportive, exportez en PDF ou CSV pour vos réunions de recrutement, en un clic.',
    points: ['Shortlists collaboratives', 'Export PDF & CSV', 'Rôles scout / admin / viewer'],
  },
]

function Features() {
  return (
    <section id="features" style={{
      padding: '100px 48px',
      maxWidth: '1200px', margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <SectionLabel>Fonctionnalités</SectionLabel>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '800',
          letterSpacing: '-0.02em', color: C.text, marginBottom: '16px',
        }}>
          Tout ce dont un staff de scouting a besoin
        </h2>
        <p style={{ color: C.muted, fontSize: '16px', maxWidth: '480px', margin: '0 auto' }}>
          Des outils pensés pour les professionnels du recrutement, pas pour les développeurs.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {features.map(({ icon: Icon, title, desc, points }) => (
          <div key={title} style={{
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '32px',
            transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.green)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: C.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <Icon size={22} color={C.green} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '700', color: C.text, marginBottom: '12px' }}>
              {title}
            </h3>
            <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.7, marginBottom: '20px' }}>
              {desc}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {points.map(p => (
                <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.muted }}>
                  <CheckCircle size={14} color={C.green} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Social Proof ─────────────────────────────────────────────────────────────
const clubs = [
  'FC Académie', 'Sporting Pro', 'Atlético Scout',
  'Nordic FC', 'Red Star Dev', 'Atlas Football',
]

function SocialProof() {
  return (
    <section style={{
      padding: '80px 48px',
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '13px', color: C.mutedDark, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '40px' }}>
        Ils nous font confiance
      </p>
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        justifyContent: 'center', alignItems: 'center',
        gap: '16px', maxWidth: '900px', margin: '0 auto',
      }}>
        {clubs.map(name => (
          <div key={name} style={{
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '14px 28px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <Shield size={16} color={C.mutedDark} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: C.mutedDark }}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Solo',
    price: 'Gratuit',
    sub: 'Pour toujours',
    desc: 'Pour les scouts indépendants qui démarrent.',
    featured: false,
    cta: 'Commencer gratuitement',
    ctaTo: '/register',
    features: [
      '1 utilisateur',
      'Jusqu\'à 50 joueurs',
      'Shortlist personnelle',
      'Export CSV',
      'Score automatique',
    ],
  },
  {
    name: 'Club Pro',
    price: '€49',
    sub: 'par mois',
    desc: 'Pour les staffs de recrutement qui travaillent en équipe.',
    featured: true,
    cta: 'Démarrer l\'essai',
    ctaTo: '/register',
    features: [
      'Jusqu\'à 10 scouts',
      'Joueurs illimités',
      'Shortlists collaboratives',
      'Export PDF & CSV',
      'Score & labels avancés',
      'Support prioritaire',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Sur devis',
    sub: '',
    desc: 'Pour les clubs professionnels et agences multi-marchés.',
    featured: false,
    cta: 'Nous contacter',
    ctaTo: '/login',
    features: [
      'Scouts illimités',
      'Multi-organisations',
      'API & intégrations',
      'SLA garanti',
      'Onboarding dédié',
      'Données propriétaires',
    ],
  },
]

function Pricing() {
  return (
    <section id="pricing" style={{ padding: '100px 48px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <SectionLabel>Pricing</SectionLabel>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '800',
          letterSpacing: '-0.02em', color: C.text, marginBottom: '16px',
        }}>
          Simple, transparent, sans surprise
        </h2>
        <p style={{ color: C.muted, fontSize: '16px' }}>
          Commencez gratuitement. Passez au pro quand votre staff grandit.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'start' }}>
        {plans.map(plan => (
          <div key={plan.name} style={{
            background: plan.featured ? 'linear-gradient(135deg, #0d1f14 0%, #0a1a10 100%)' : C.bgCard,
            border: `${plan.featured ? '2px' : '1px'} solid ${plan.featured ? C.green : C.border}`,
            borderRadius: '16px', padding: '32px',
            position: 'relative',
            boxShadow: plan.featured ? `0 0 40px ${C.greenGlow}` : 'none',
          }}>
            {plan.featured && (
              <div style={{
                position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                background: C.green, color: '#08091A',
                fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em',
                padding: '4px 14px', borderRadius: '999px',
              }}>
                POPULAIRE
              </div>
            )}

            <p style={{ fontSize: '13px', fontWeight: '700', color: plan.featured ? C.green : C.muted, marginBottom: '8px', letterSpacing: '0.05em' }}>
              {plan.name.toUpperCase()}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: C.text, letterSpacing: '-0.02em' }}>
                {plan.price}
              </span>
              {plan.sub && <span style={{ fontSize: '14px', color: C.muted }}>{plan.sub}</span>}
            </div>
            <p style={{ fontSize: '13px', color: C.muted, marginBottom: '28px', lineHeight: 1.5 }}>
              {plan.desc}
            </p>

            <Link to={plan.ctaTo} style={{
              display: 'block', textAlign: 'center',
              background: plan.featured ? C.green : 'transparent',
              border: `1px solid ${plan.featured ? C.green : C.border}`,
              color: plan.featured ? '#08091A' : C.text,
              fontSize: '14px', fontWeight: '700',
              padding: '12px', borderRadius: '8px',
              textDecoration: 'none', marginBottom: '28px',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {plan.cta}
            </Link>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: C.muted }}>
                  <CheckCircle size={14} color={plan.featured ? C.green : C.mutedDark} />
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

// ─── CTA Final ───────────────────────────────────────────────────────────────
function CTAFinal() {
  return (
    <section style={{
      margin: '0 48px 100px',
      background: `linear-gradient(135deg, #0d1f14 0%, #0a1a10 100%)`,
      border: `1px solid ${C.green}`,
      borderRadius: '24px', padding: '72px 48px',
      textAlign: 'center',
      boxShadow: `0 0 80px ${C.greenGlow}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '300px',
        background: `radial-gradient(ellipse, ${C.greenGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{ marginBottom: '20px' }}>
          <GreenBadge><Users size={11} /> Rejoignez la communauté</GreenBadge>
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: '900',
          letterSpacing: '-0.03em', color: C.text, marginBottom: '16px',
        }}>
          Rejoignez les clubs qui recrutent mieux
        </h2>
        <p style={{ fontSize: '16px', color: C.muted, marginBottom: '40px', maxWidth: '440px', margin: '0 auto 40px' }}>
          Créez votre compte en 30 secondes. Aucune carte de crédit requise.
        </p>
        <Link to="/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: C.green, color: '#08091A',
          fontSize: '15px', fontWeight: '800',
          padding: '16px 36px', borderRadius: '10px',
          textDecoration: 'none', transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Commencer gratuitement
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: '40px 48px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>⚽</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>
          VIZ<span style={{ color: C.green }}>ION</span>
        </span>
        <span style={{ fontSize: '13px', color: C.mutedDark, marginLeft: '8px' }}>
          © 2026
        </span>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {['Confidentialité', 'CGU', 'Mentions légales', 'Contact'].map(label => (
          <a key={label} href="#" style={{
            fontSize: '13px', color: C.mutedDark,
            textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
            onMouseLeave={e => (e.currentTarget.style.color = C.mutedDark)}
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Redirect authenticated users straight to the app
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  if (loading) return null

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Nav />
      <Hero />
      <Features />
      <SocialProof />
      <Pricing />
      <CTAFinal />
      <Footer />
    </div>
  )
}
