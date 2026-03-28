import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import VizionLogo from '../components/VizionLogo'

type Invitation = {
  id: string
  email: string
  organization_id: string
  role: string
  expires_at: string
  accepted_at: string | null
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  scout: 'Scout',
  viewer: 'Lecteur',
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const acceptedRef = useRef(false)

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Step 1: validate the token
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('Token d\'invitation manquant.')
      return
    }

    supabase
      .from('invitations')
      .select('id, email, organization_id, role, expires_at, accepted_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('error')
          setErrorMsg('Invitation invalide ou expirée.')
          return
        }
        if (data.accepted_at) {
          setStatus('error')
          setErrorMsg('Cette invitation a déjà été acceptée.')
          return
        }
        setInvitation(data as Invitation)
        setStatus('ready')
      })
  }, [token])

  // Step 2: accept once user is authenticated and invitation is loaded
  useEffect(() => {
    if (status !== 'ready' || !invitation || !user || acceptedRef.current) return
    acceptedRef.current = true
    acceptInvitation(invitation)
  }, [status, invitation, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function acceptInvitation(inv: Invitation) {
    setStatus('accepting')
    try {
      // 1. Mark invitation accepted
      const { error: updErr } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', inv.id)

      if (updErr) throw updErr

      // 2. Add user to organization
      const { error: orgErr } = await supabase
        .from('user_organizations')
        .upsert(
          { user_id: user!.id, organization_id: inv.organization_id, role: inv.role },
          { onConflict: 'user_id,organization_id' }
        )

      if (orgErr) throw orgErr

      // 3. Set active organization on profile (upsert in case profile row doesn't exist yet)
      await supabase
        .from('profiles')
        .upsert(
          { user_id: user!.id, organization_id: inv.organization_id, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )

      setStatus('done')
      setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Une erreur est survenue.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0f1e',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#111827',
        borderRadius: '20px',
        border: '1px solid #1f2937',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #1f2937' }}>
          <VizionLogo size="lg" />
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Football Scouting Intelligence</p>
        </div>

        {/* Body */}
        <div style={{ padding: '36px 32px 40px' }}>
          {status === 'loading' && (
            <>
              <Loader size={36} color="#4D7FFF" style={{ margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Vérification de l'invitation…</p>
            </>
          )}

          {status === 'accepting' && (
            <>
              <Loader size={36} color="#4D7FFF" style={{ margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'white', fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>Acceptation en cours…</p>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Ajout à votre organisation</p>
            </>
          )}

          {status === 'done' && (
            <>
              <CheckCircle size={40} color="#00C896" style={{ margin: '0 auto 16px', display: 'block' }} />
              <p style={{ color: 'white', fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
                Invitation acceptée !
              </p>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 24px' }}>
                Bienvenue dans l'équipe. Redirection vers le dashboard…
              </p>
              <div style={{ height: '3px', borderRadius: '99px', background: '#1f2937', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: '100%', background: '#00C896',
                  animation: 'progressBar 2.5s linear forwards',
                }} />
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px', display: 'block' }} />
              <p style={{ color: 'white', fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
                Invitation invalide
              </p>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.6 }}>
                {errorMsg}
              </p>
              <Link
                to="/dashboard"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  background: 'rgba(77,127,255,0.18)',
                  border: '1px solid rgba(77,127,255,0.35)',
                  borderRadius: '10px',
                  color: '#4D7FFF',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Aller au dashboard
              </Link>
            </>
          )}

          {/* Not logged in: show login/register CTA */}
          {status === 'ready' && !user && invitation && (
            <>
              <UserPlus size={36} color="#4D7FFF" style={{ margin: '0 auto 20px', display: 'block' }} />
              <p style={{ color: 'white', fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
                Invitation à rejoindre l'équipe
              </p>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 6px' }}>
                Rôle : <strong style={{ color: 'white' }}>{ROLE_LABELS[invitation.role] || invitation.role}</strong>
              </p>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 28px', lineHeight: 1.6 }}>
                Connectez-vous ou créez un compte pour accepter cette invitation.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Link
                  to={`/login?next=/invite/${token}`}
                  style={{
                    flex: 1,
                    display: 'block',
                    padding: '10px 16px',
                    background: 'rgba(77,127,255,0.18)',
                    border: '1px solid rgba(77,127,255,0.35)',
                    borderRadius: '10px',
                    color: '#4D7FFF',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Se connecter
                </Link>
                <Link
                  to={`/register?next=/invite/${token}`}
                  style={{
                    flex: 1,
                    display: 'block',
                    padding: '10px 16px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Créer un compte
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressBar { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }
      `}</style>
    </div>
  )
}
