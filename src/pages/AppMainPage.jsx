import { Outlet } from 'react-router-dom'
import {Sidebar} from "../components/layout/Sidebar.jsx";

export default function AppMainPage() {
  return (
    <div className="flex h-screen bg-[#0B1437] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
