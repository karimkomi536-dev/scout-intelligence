import { useState, lazy, Suspense } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorFallback from './components/ErrorFallback'
import { CompareProvider } from './contexts/CompareContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import PageLoader from './components/PageLoader'

// ── Lazy page chunks ───────────────────────────────────────────────────────────

const Landing         = lazy(() => import('./pages/Landing'))
const Login           = lazy(() => import('./pages/Login'))
const Register        = lazy(() => import('./pages/Register'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Players         = lazy(() => import('./pages/Players'))
const PlayerDetail    = lazy(() => import('./pages/PlayerDetail'))
const Compare         = lazy(() => import('./pages/Compare'))
const Shortlist       = lazy(() => import('./pages/Shortlist'))
const SharedShortlist = lazy(() => import('./pages/SharedShortlist'))
const NewsletterPage  = lazy(() => import('./pages/NewsletterPage'))
const Upload          = lazy(() => import('./pages/Upload'))
const Settings        = lazy(() => import('./pages/Settings'))
const Billing         = lazy(() => import('./pages/Billing'))
const ShadowTeam      = lazy(() => import('./pages/ShadowTeam'))
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'))
const Onboarding      = lazy(() => import('./pages/Onboarding'))
const WorldMap        = lazy(() => import('./pages/WorldMap'))
const Demo            = lazy(() => import('./pages/Demo'))
const Privacy         = lazy(() => import('./pages/Privacy'))
const Terms           = lazy(() => import('./pages/Terms'))
const CronLogs        = lazy(() => import('./pages/admin/CronLogs'))
const DataDashboard   = lazy(() => import('./pages/admin/DataDashboard'))

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('vizion-v4-splash') !== 'done'
  })

  return (
    <>
      {showSplash && (
        <SplashScreen
          onDone={() => {
            sessionStorage.setItem('vizion-v4-splash', 'done')
            setShowSplash(false)
          }}
        />
      )}

      <CompareProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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

              {/* Onboarding — protected, outside Layout */}
              <Route path="/onboarding" element={
                <ProtectedRoute><Onboarding /></ProtectedRoute>
              } />

              {/* Demo — public, no auth required */}
              <Route path="/demo" element={<Demo />} />

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
                <Route path="dashboard"        element={<Dashboard />} />
                <Route path="players"          element={<Players />} />
                <Route path="players/:id"      element={<PlayerDetail />} />
                <Route path="compare"          element={<Compare />} />
                <Route path="shortlist"        element={<Shortlist />} />
                <Route path="newsletter"       element={<NewsletterPage />} />
                <Route path="upload"           element={<Upload />} />
                <Route path="settings"         element={<Settings />} />
                <Route path="settings/billing" element={<Billing />} />
                <Route path="map"              element={<WorldMap />} />
                <Route path="shadow-team"      element={<ShadowTeam />} />
                <Route path="admin/cron"       element={<CronLogs />} />
                <Route path="admin/data"       element={<AdminRoute><DataDashboard /></AdminRoute>} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </CompareProvider>
    </>
  )
}

export default Sentry.withErrorBoundary(App, {
  fallback: <ErrorFallback />,
})
