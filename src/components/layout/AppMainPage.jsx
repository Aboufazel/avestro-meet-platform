import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppMainPage() {
  return (
    <div className="flex h-screen bg-olive-950 overflow-hidden">
      <main className="flex-1 overflow-y-auto">{<Outlet />}</main>
      <Sidebar />
    </div>
  )
}
