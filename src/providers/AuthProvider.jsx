import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { appRoutes } from '../routes/appRoutes'

export default function AuthProvider({ children }) {
  const token = useAuthStore(state => state.token)

  if (!token) {
    return <Navigate to={appRoutes.auth.login} replace />
  }

  return children || <Outlet />
}
