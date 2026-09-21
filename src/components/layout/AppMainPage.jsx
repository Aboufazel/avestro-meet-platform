import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu } from 'lucide-react'

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
        <main className="flex-1 min-h-0 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  )
}
