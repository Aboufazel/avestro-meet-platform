import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu, LayoutDashboard, Plus, UserCircle } from 'lucide-react'

function NavMobileItem({ to, icon: Icon, label, primary }) {
  return (
    <NavLink to={to} end={to === '/dashboard'} className={({ isActive }) => `flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl active:scale-95 transition-all ${isActive ? 'text-[#4f7cff]' : 'text-[#68758a]'}`}>
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${primary ? 'bg-[#4f7cff] text-white shadow-[0_8px_20px_rgba(79,124,255,.22)]' : 'bg-[#f4f7fb]'}`}><Icon className="w-4 h-4" /></span>
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}

export function AppMainPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#f4f7fb] overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-[#08101d]/45 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 right-0 z-30 transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-xl border-b border-[#e5eaf2] shrink-0">
          <div className="flex items-center gap-2">
            <img src="/avestro-logo.png" alt="اَوسترو" className="w-8 h-8" />
            <span className="text-[#101827] font-bold text-sm">اَوسترو میت</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl text-[#68758a] border border-[#e5eaf2] hover:bg-[#edf2ff]">
            <Menu className="w-4 h-4" />
          </button>
        </div>
        <main className="flex-1 min-h-0 overflow-y-auto pb-[74px] lg:pb-0"><Outlet /></main>
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 bg-white/90 backdrop-blur-2xl border-t border-[#e5eaf2]">
          <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
            <NavMobileItem to="/dashboard" icon={LayoutDashboard} label="نمای کلی" />
            <NavMobileItem to="/dashboard/create" icon={Plus} label="جلسه جدید" primary />
            <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl text-[#68758a] active:scale-95 transition-transform">
              <span className="w-8 h-8 rounded-xl bg-[#f4f7fb] flex items-center justify-center"><UserCircle className="w-4 h-4" /></span>
              <span className="text-[10px] font-medium">بیشتر</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
