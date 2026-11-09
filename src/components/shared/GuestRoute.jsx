import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function GuestRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const { search } = useLocation()
  if (token) {
    // بعد از ورود، مقصد ?next (فقط مسیر داخلی) یا اشتراک (اگر پلن رایگان گرفته شده) یا داشبورد
    const params = new URLSearchParams(search)
    const next = params.get('next')
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null
    return <Navigate to={safeNext || (params.get('free') ? '/dashboard/subscription' : '/dashboard')} replace />
  }
  return children
}
