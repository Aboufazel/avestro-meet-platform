import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Plus,
  Settings,
  LogOut,
  Video,
  X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ui/Avatar'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
  // { to: '/dashboard/events', icon: Calendar, label: 'رویدادها' },
  { to: '/dashboard/create', icon: Plus, label: 'رویداد جدید' },
  // { to: '/dashboard/settings', icon: Settings, label: 'تنظیمات' },
]

export function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast('خروج انجام شد', { icon: '👋' })
    navigate('/')
  }

  return (
    <aside className="w-64 h-full bg-olive-900 border-l border-olive-700 flex flex-col shrink-0">

      {/* Logo + close button */}
      <div className="p-5 border-b border-olive-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[12px] bg-olive-500 flex items-center justify-center">
            {/*<Video className="w-5 h-5 text-olive-950" />*/}
            <img src="/avestro-logo.png" alt="اَوسترو" className="w-12 h-12 shrink-0" />
          </div>
          <div>
            <p className="text-olive-100 font-medium text-sm">اَوسترو میت</p>
            <p className="text-olive-600 text-xs">Austro Meet</p>
          </div>
        </div>
        {/* فقط روی موبایل نمایش داده میشه */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-olive-500 hover:bg-olive-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-olive-800 text-olive-100 border border-olive-700'
                  : 'text-olive-500 hover:bg-olive-800/60 hover:text-olive-300',
              ].join(' ')
            }
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-olive-700">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={user?.displayName || user?.display_name || user?.username || 'کاربر'} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-olive-100 text-sm truncate">
              {user?.displayName || user?.display_name || user?.username || 'کاربر'}
            </p>
            <p className="text-olive-600 text-xs truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-olive-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-sm"
        >
          <LogOut className="w-4 h-4" />
          خروج از حساب
        </button>
      </div>

    </aside>
  )
}