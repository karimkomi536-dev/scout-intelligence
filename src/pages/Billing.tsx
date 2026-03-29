import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, CheckCircle, Zap, Crown, Building2, ExternalLink, Loader2 } from 'lucide-react'
import { useOrganization } from '../hooks/useOrganization'
import { redirectToCheckout, redirectToPortal } from '../lib/stripe'

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  {
    id:    'free',
    name:  'Solo',
    price: '0€',
    period: '',
    desc:  'Pour les scouts indépendants',
    icon:  <Zap size={18} />,
    color: 'rgba(77,127,255,0.8)',
    features: ['50 joueurs max', 'Filtres de base', '1 shortlist', 'Export PDF limité'],
  },
  {
    id:    'pro',
    name:  'Pro',
    price: '49€',
    period: '/mois',
    desc:  'Pour les clubs et agences',
    icon:  <Crown size={18} />,
    color: '#00C896',
    featured: true,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY as string,
    features: [
      'Joueurs illimités',
      'Filtres avancés',
      'Shortlists illimitées',
      'Scoring personnalisé',
      'Export PDF complet',
      'Invitations équipe',
      'Shadow Team',
    ],
  },
  {
    id:    'enterprise',
    name:  'Enterprise',
    price: 'Sur mesure',
    period: '',
    desc:  'Grands clubs & fédérations',
    icon:  <Building2 size={18} />,
    color: '#9B6DFF',
    features: [
      'Tout ce qui est inclus dans Pro',
      'API access',
      'Intégrations sur mesure',
      'Support dédié',
      'SLA garanti',
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const { organization, loading: orgLoading } = useOrganization()
  const [searchParams] = useSearchParams()

  const [redirecting, setRedirecting]   = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState(false)

  // After Stripe redirect back
  useEffect(() => {
    if (searchParams.get('session_id')) {
      setSuccessBanner(true)
      const t = setTimeout(() => setSuccessBanner(false), 6000)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  const currentPlan = organization?.plan ?? 'free'

  async function handleUpgrade(priceId: string) {
    if (!organization?.id) return
    setError(null)
    setRedirecting(true)
    try {
      await redirectToCheckout(priceId, organization.id)
    } catch (e) {
      setError((e as Error).message)
      setRedirecting(false)
    }
  }

  async function handlePortal() {
    if (!organization?.id) return
    setError(null)
    setRedirecting(true)
    try {
      await redirectToPortal(organization.id)
    } catch (e) {
      setError((e as Error).message)
      setRedirecting(false)
    }
  }

  if (orgLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={28} color="#00C896" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px 80px', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <CreditCard size={22} color="#00C896" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Facturation</h1>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', margin: 0 }}>
          Gérez votre abonnement VIZION
        </p>
      </div>

      {/* Success banner */}
      {successBanner && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          10,
          background:   'rgba(0,200,150,0.12)',
          border:       '1px solid rgba(0,200,150,0.30)',
          borderRadius: 10,
          padding:      '12px 16px',
          marginBottom: 24,
          color:        '#00C896',
          fontSize:     14,
          fontWeight:   600,
        }}>
          <CheckCircle size={18} />
          Abonnement activé avec succès ! Merci.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          background:   'rgba(255,90,90,0.12)',
          border:       '1px solid rgba(255,90,90,0.30)',
          borderRadius: 10,
          padding:      '12px 16px',
          marginBottom: 24,
          color:        '#ff6b6b',
          fontSize:     13,
        }}>
          {error}
        </div>
      )}

      {/* Current plan card */}
      <div style={{
        background:   'rgba(255,255,255,0.04)',
        border:       '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding:      '18px 20px',
        marginBottom: 28,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        flexWrap:     'wrap',
        gap:          12,
      }}>
        <div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4, margin: 0 }}>
            PLAN ACTUEL
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, textTransform: 'capitalize' }}>
            {currentPlan}
          </p>
          {organization?.name && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', margin: '2px 0 0' }}>
              {organization.name}
            </p>
          )}
        </div>

        {currentPlan !== 'free' && (
          <button
            onClick={handlePortal}
            disabled={redirecting}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          7,
              background:   'rgba(255,255,255,0.07)',
              border:       '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding:      '9px 16px',
              color:        'rgba(255,255,255,0.80)',
              fontSize:     13,
              fontWeight:   600,
              cursor:       redirecting ? 'wait' : 'pointer',
              opacity:      redirecting ? 0.6 : 1,
            }}
          >
            <ExternalLink size={14} />
            Gérer l'abonnement
          </button>
        )}
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id
          const canUpgrade = plan.id === 'pro' && currentPlan === 'free' && plan.priceId
          const isEnterprise = plan.id === 'enterprise'

          return (
            <div
              key={plan.id}
              style={{
                background:   isCurrent ? 'rgba(0,200,150,0.06)' : 'rgba(255,255,255,0.03)',
                border:       isCurrent
                  ? '1px solid rgba(0,200,150,0.30)'
                  : plan.featured
                    ? '1px solid rgba(77,127,255,0.25)'
                    : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding:      '18px 20px',
              }}
            >
              {/* Plan header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width:        36,
                    height:       36,
                    borderRadius: 8,
                    background:   `${plan.color}18`,
                    border:       `1px solid ${plan.color}35`,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    color:        plan.color,
                  }}>
                    {plan.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{plan.name}</span>
                      {isCurrent && (
                        <span style={{
                          fontSize:     10,
                          fontWeight:   700,
                          color:        '#00C896',
                          background:   'rgba(0,200,150,0.12)',
                          border:       '1px solid rgba(0,200,150,0.25)',
                          borderRadius: 4,
                          padding:      '2px 7px',
                          letterSpacing: '0.05em',
                        }}>
                          ACTUEL
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{plan.desc}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{plan.price}</span>
                  {plan.period && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                    <CheckCircle size={13} color={plan.color} style={{ flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {canUpgrade && (
                <button
                  onClick={() => handleUpgrade(plan.priceId!)}
                  disabled={redirecting}
                  style={{
                    width:        '100%',
                    background:   'linear-gradient(135deg, #00C896, #00a880)',
                    border:       'none',
                    borderRadius: 9,
                    padding:      '11px 0',
                    color:        '#fff',
                    fontSize:     14,
                    fontWeight:   700,
                    cursor:       redirecting ? 'wait' : 'pointer',
                    opacity:      redirecting ? 0.7 : 1,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    gap:          7,
                  }}
                >
                  {redirecting ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Crown size={15} />
                  )}
                  {redirecting ? 'Redirection…' : 'Passer à Pro'}
                </button>
              )}

              {isEnterprise && !isCurrent && (
                <a
                  href="mailto:contact@vizion.app?subject=Enterprise"
                  style={{
                    display:      'block',
                    width:        '100%',
                    background:   'rgba(155,109,255,0.12)',
                    border:       '1px solid rgba(155,109,255,0.30)',
                    borderRadius: 9,
                    padding:      '11px 0',
                    color:        '#9B6DFF',
                    fontSize:     14,
                    fontWeight:   700,
                    cursor:       'pointer',
                    textAlign:    'center',
                    textDecoration: 'none',
                  }}
                >
                  Nous contacter
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p style={{
        fontSize:   12,
        color:      'rgba(255,255,255,0.30)',
        textAlign:  'center',
        marginTop:  28,
        lineHeight: 1.6,
      }}>
        Paiements sécurisés par Stripe. Annulation possible à tout moment.
      </p>
    </div>
  )
}
