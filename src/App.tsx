import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
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

function App() {
  return (
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

          {/* App — protégée par ProtectedRoute */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="players"    element={<Players />} />
            <Route path="players/:id" element={<PlayerDetail />} />
            <Route path="compare"    element={<Compare />} />
            <Route path="shortlist"  element={<Shortlist />} />
            <Route path="newsletter" element={<NL />} />
            <Route path="upload"     element={<Upload />} />
            <Route path="settings"     element={<Settings />} />
            <Route path="shadow-team"  element={<ShadowTeam />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </CompareProvider>
  )
}

export default App
