import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function GuestRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return children
}
