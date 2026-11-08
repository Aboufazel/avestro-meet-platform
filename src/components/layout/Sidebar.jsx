import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut, X, ChevronLeft, Sparkles, CreditCard, Tags, Users, CalendarDays } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ui/Avatar'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'نمای کلی', end: true },
  { to: '/dashboard/rooms', icon: CalendarDays, label: 'لیست اتاق‌ها' },
  { to: '/dashboard/people', icon: Users, label: 'تعریف کاربران' },
  { to: '/dashboard/subscription', icon: CreditCard, label: 'اشتراک و پرداخت' },
  { to: '/dashboard/pricing', icon: Tags, label: 'تعرفه‌ها' },
  { to: '/dashboard/settings', icon: Settings, label: 'تنظیمات حساب' },
]
export function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); toast('خروج انجام شد'); navigate('/') }
  return <aside className="meet-sidebar flex h-full w-[272px] shrink-0 flex-col">
    <div className="border-b border-white/[.07] px-5 py-6"><NavLink to="/dashboard" className="flex items-center gap-3" onClick={onClose}><img src="/avestro-logo.png" alt="اَوسترو" className="h-11 w-11 rounded-xl"/><div><p className="text-sm font-bold">اَوسترو میت</p><p className="mt-1 text-[10px] tracking-wide text-white/30">AVESTRO MEET</p></div></NavLink>{onClose && <button onClick={onClose} aria-label="بستن منو" className="absolute left-3 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[.06] lg:hidden"><X size={16}/></button>}</div>
    <nav className="flex-1 px-3 py-5"><p className="mb-3 px-3 text-[10px] text-white/25">فضای کاری</p><div className="space-y-1.5">{navItems.map(({to,icon:Icon,label,end})=><NavLink key={to} to={to} end={end} onClick={onClose} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${isActive?'meet-nav-active':'text-white/50 hover:bg-white/[.04] hover:text-white/85'}`}><Icon size={17}/><span>{label}</span>{end && <ChevronLeft size={14} className="mr-auto opacity-30"/>}</NavLink>)}</div></nav>
    <div className="mx-3 mb-3 rounded-2xl border border-white/[.06] bg-white/[.04] p-4"><div className="mb-3 flex items-center gap-2"><Sparkles size={15} className="text-[#54d9b0]"/><span className="text-[10px] text-white/45">فضای جلسه</span></div><p className="text-xs leading-6 text-white/75">برای ورود به اتاق جلسه از لینک اختصاصی هر اتاق استفاده کنید.</p></div>
    <div className="border-t border-white/[.07] p-4"><div className="mb-3 flex items-center gap-3"><Avatar name={user?.displayName || user?.display_name || user?.username || 'کاربر'} size="md"/><div className="min-w-0 flex-1"><p className="truncate text-xs text-white">{user?.displayName || user?.display_name || user?.username || 'کاربر'}</p><p className="mt-1 truncate text-[10px] text-white/30">{user?.email || ''}</p></div></div><button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-white/45 transition hover:bg-[#ef6678]/10 hover:text-[#ff8795]"><LogOut size={16}/>خروج از حساب</button></div>
  </aside>
}
