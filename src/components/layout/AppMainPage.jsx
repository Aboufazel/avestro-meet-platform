import { useCallback, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Home, CalendarDays, Plus, MoreHorizontal, X, Settings, CreditCard, Tags, Users, LogOut, Headset, UserRound } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ui/Avatar'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import toast from 'react-hot-toast'

function MobileItem({ to, icon: Icon, label }) {
  return <NavLink to={to} end={to === '/dashboard'} className={({ isActive }) => `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition ${isActive ? 'text-[#4f7cff]' : 'text-[#71809a]'}`} aria-label={label}>
    <span className="flex h-8 w-8 items-center justify-center"><Icon size={20} strokeWidth={2}/></span><span>{label}</span>
  </NavLink>
}

export function AppMainPage() {
  const [moreOpen, setMoreOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const close = useCallback(() => setMoreOpen(false), [])
  const sheetRef = useDialogFocus(moreOpen, close)
  const handleLogout = () => { logout(); toast('خروج انجام شد'); navigate('/'); close() }

  return <div className="flex h-[100dvh] overflow-hidden bg-[#f4f7fb]" dir="rtl">
    {sidebarOpen && <button aria-label="بستن منو" className="fixed inset-0 z-30 bg-[#08101d]/55 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)}/>}
    <div className={`fixed inset-y-0 right-0 z-40 transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}><Sidebar onClose={() => setSidebarOpen(false)}/></div>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#e5eaf2] bg-white/85 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2"><img src="/avestro-logo.png" alt="اَوسترو" className="h-8 w-8 rounded-lg"/><b className="text-sm text-[#101827]">اَوسترو میت</b></div>
        <button onClick={() => setMoreOpen(true)} aria-label="بیشتر" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#68758a] hover:bg-[#edf2ff]"><MoreHorizontal/></button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto pb-24 lg:pb-0"><Outlet/></main>
      <nav aria-label="ناوبری اصلی" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5eaf2] bg-white/95 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(20,35,65,.06)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
          <MobileItem to="/dashboard" icon={Home} label="خانه"/>
          <MobileItem to="/dashboard/rooms" icon={CalendarDays} label="اتاق‌ها"/>
          <NavLink to="/dashboard/create" aria-label="ساخت اتاق جدید" className="-mt-5 flex min-w-0 flex-col items-center justify-end gap-1 text-[11px] font-semibold text-[#4f7cff]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white bg-[#4f7cff] text-white shadow-[0_8px_20px_rgba(79,124,255,.28)] transition-transform active:scale-95"><Plus size={23} strokeWidth={2.5}/></span><span>ساخت اتاق</span>
          </NavLink>
          <MobileItem to="/dashboard/people" icon={Users} label="کاربران"/>
          <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold ${moreOpen ? 'text-[#4f7cff]' : 'text-[#71809a]'}`}><span className="flex h-8 w-8 items-center justify-center"><MoreHorizontal size={21}/></span><span>بیشتر</span></button>
        </div>
      </nav>
    </div>
    {moreOpen && <div className="fixed inset-0 z-[70] bg-[#08101d]/45 backdrop-blur-sm lg:hidden" onClick={close}>
      <section ref={sheetRef} role="dialog" aria-modal="true" aria-label="بیشتر و حساب کاربری" onClick={e => e.stopPropagation()} className="absolute inset-x-0 bottom-0 rounded-t-[28px] border border-white/70 bg-white px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] text-[#101827] shadow-2xl" style={{animation:'room-sheet-in .28s ease both'}}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#d9e1ee]"/><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-extrabold">بیشتر</h2><button data-autofocus onClick={close} aria-label="بستن" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f7fb]"><X size={18}/></button></div>
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[#f6f8fc] p-3"><Avatar name={user?.display_name || user?.username || 'کاربر'} size="lg"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user?.display_name || user?.username || 'کاربر'}</p><p className="mt-1 truncate text-xs text-[#8d98aa]">{user?.email || ''}</p></div><UserRound className="text-[#8d98aa]"/></div>
        <div className="grid grid-cols-2 gap-2">
          {[['/dashboard/people',Users,'تعریف کاربران'],['/dashboard/subscription',CreditCard,'اشتراک و پرداخت'],['/dashboard/pricing',Tags,'تعرفه‌ها'],['/dashboard/settings',Settings,'تنظیمات حساب']].map(([to,Icon,label])=><NavLink key={to} to={to} onClick={close} className="flex min-h-12 items-center gap-2 rounded-xl border border-[#e8edf5] px-3 text-sm font-semibold text-[#34415a] hover:bg-[#f6f8fc]"><Icon size={17} className="text-[#4f7cff]"/>{label}</NavLink>)}
        </div>
        <button onClick={close} className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#34415a] hover:bg-[#f6f8fc]"><Headset size={17}/>راهنما و پشتیبانی</button>
        <button onClick={handleLogout} className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl bg-[#fff3f4] px-3 text-sm font-bold text-[#d64052]"><LogOut size={17}/>خروج از حساب</button>
      </section>
    </div>}
  </div>
}
