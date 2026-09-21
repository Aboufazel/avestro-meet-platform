import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Plus, LogOut, X, ChevronLeft, Video, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ui/Avatar'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'نمای کلی' },
  { to: '/dashboard/create', icon: Plus, label: 'ساخت جلسه' },
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
    <aside className="meet-sidebar w-[272px] h-full flex flex-col shrink-0">
      <div className="px-5 pt-6 pb-5 border-b border-white/[.07]">
        <div className="flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <img src="/avestro-logo.png" alt="اَوسترو" className="w-11 h-11 rounded-xl" />
            <div><p className="font-bold text-sm">اَوسترو میت</p><p className="text-[10px] text-white/30 mt-1 tracking-wide">AVESTRO MEET</p></div>
          </NavLink>
          {onClose && <button onClick={onClose} className="lg:hidden w-8 h-8 rounded-lg text-white/45 hover:bg-white/[.06]"><X className="w-4 h-4 mx-auto" /></button>}
        </div>
      </div>

      <nav className="flex-1 px-3 py-5">
        <p className="px-3 text-[10px] text-white/25 mb-2">فضای کاری</p>
        <div className="space-y-1.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/dashboard'} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${isActive ? 'meet-nav-active' : 'text-white/45 hover:text-white/80 hover:bg-white/[.04]'}`}>
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {to === '/dashboard' && <ChevronLeft className="w-3.5 h-3.5 mr-auto opacity-30" />}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mx-3 mb-3 rounded-2xl bg-white/[.04] border border-white/[.06] p-4">
        <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-[#54d9b0]" /><span className="text-[10px] text-white/45">فضای جلسه</span></div>
        <p className="text-xs text-white/75 leading-6">برای ورود به اتاق جلسه از لینک اختصاصی هر رویداد استفاده کنید.</p>
      </div>

      <div className="p-4 border-t border-white/[.07]">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={user?.displayName || user?.display_name || user?.username || 'کاربر'} size="md" />
          <div className="flex-1 min-w-0"><p className="text-white text-xs truncate">{user?.displayName || user?.display_name || user?.username || 'کاربر'}</p><p className="text-white/30 text-[10px] truncate mt-1">{user?.email || ''}</p></div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-white/40 hover:text-[#ff8795] hover:bg-[#ef6678]/10 transition-all text-xs">
          <LogOut className="w-4 h-4" /> خروج از حساب
        </button>
      </div>
    </aside>
  )
}
