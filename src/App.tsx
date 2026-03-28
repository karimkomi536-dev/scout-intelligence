import { useState } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorFallback from './components/ErrorFallback'
import { CompareProvider } from './contexts/CompareContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Compare from './pages/Compare'
import Shortlist from './pages/Shortlist'
import SharedShortlist from './pages/SharedShortlist'
import NL from './pages/NL'
import Upload from './pages/Upload'
import Settings from './pages/Settings'
import ShadowTeam from './pages/ShadowTeam'
import AcceptInvitation from './pages/AcceptInvitation'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import SplashScreen from './components/SplashScreen'

function App() {
  const [splashDone, setSplashDone] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('vizion-splash-v2') === 'done'
    } catch {
      return false
    }
  })

  const handleSplashDone = () => {
    try {
      sessionStorage.setItem('vizion-splash-v2', 'done')
    } catch {}
    setSplashDone(true)
  }

  return (
    <>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}

      <CompareProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing — publique, redirige vers /dashboard si déjà connecté */}
            <Route path="/" element={<Landing />} />

            {/* Auth */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public share view */}
            <Route path="/shortlist/:token" element={<SharedShortlist />} />

            {/* Accept team invitation */}
            <Route path="/invite/:token" element={<AcceptInvitation />} />

            {/* Legal */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms"   element={<Terms />} />

            {/* App — protégée par ProtectedRoute */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard"   element={<Dashboard />} />
              <Route path="players"     element={<Players />} />
              <Route path="players/:id" element={<PlayerDetail />} />
              <Route path="compare"     element={<Compare />} />
              <Route path="shortlist"   element={<Shortlist />} />
              <Route path="newsletter"  element={<NL />} />
              <Route path="upload"      element={<Upload />} />
              <Route path="settings"    element={<Settings />} />
              <Route path="shadow-team" element={<ShadowTeam />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </CompareProvider>
    </>
  )
}

export default Sentry.withErrorBoundary(App, {
  fallback: <ErrorFallback />,
})
