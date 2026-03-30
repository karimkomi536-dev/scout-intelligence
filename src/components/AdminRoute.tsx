import { Navigate } from 'react-router-dom'
import { useOrganization } from '../hooks/useOrganization'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useOrganization()

  if (loading) return null
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
