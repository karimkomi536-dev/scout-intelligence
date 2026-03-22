import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Shortlist from './pages/Shortlist'
import NL from './pages/NL'
import Upload from './pages/Upload'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing — publique, redirige vers /dashboard si déjà connecté */}
          <Route path="/" element={<Landing />} />

          {/* Auth */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

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
            <Route path="shortlist"  element={<Shortlist />} />
            <Route path="newsletter" element={<NL />} />
            <Route path="upload"     element={<Upload />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
