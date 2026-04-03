import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import VizionLogo from '../components/VizionLogo'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromDemo = searchParams.get('source') === 'demo'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Supabase envoie un email de confirmation si activé.
    // On redirige vers /login avec un message de succès.
    navigate('/login', { state: { registered: true }, replace: true })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0a0f1e',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: '#111827',
        borderRadius: '16px',
        border: '1px solid #1f2937',
      }}>
        {/* Demo source banner */}
        {fromDemo && (
          <div style={{
            marginBottom: '24px',
            padding: '12px 16px',
            background: 'rgba(0,200,150,0.10)',
            border: '1px solid rgba(0,200,150,0.30)',
            borderRadius: '10px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#00C896',
            fontWeight: 600,
          }}>
            Bienvenue ! 14 jours d'essai gratuit.
          </div>
        )}

        {/* Logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <VizionLogo size="lg" />
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Football Scouting Intelligence
          </p>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '24px' }}>
          Create your account
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="scout@club.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>
              Confirm password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1f2937',
                border: confirm && confirm !== password ? '1px solid #7f1d1d' : '1px solid #374151',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#1f1215',
              border: '1px solid #7f1d1d',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '11px',
              backgroundColor: loading ? '#1d4ed8' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '11px', color: '#4b5563', textAlign: 'center', lineHeight: 1.6 }}>
          En créant un compte, vous acceptez nos{' '}
          <Link to="/terms" style={{ color: '#6b7280', textDecoration: 'underline' }}>
            CGU
          </Link>{' '}
          et notre{' '}
          <Link to="/privacy" style={{ color: '#6b7280', textDecoration: 'underline' }}>
            politique de confidentialité
          </Link>.
        </p>

        <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
