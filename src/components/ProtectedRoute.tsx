import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, authError, needsOnboarding } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0f1e',
        color: '#9ca3af',
        fontSize: '14px'
      }}>
        Loading…
      </div>
    )
  }

  // Auth error (ex: 429 rate limit) — don't redirect to /login
  if (authError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0f1e',
        gap: '16px',
      }}>
        <p style={{ color: '#fca5a5', fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
          Impossible de vérifier ta session ({authError}).<br />
          Attends quelques secondes puis réessaie.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, padding: '10px 24px', cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Redirect to onboarding unless already there
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
