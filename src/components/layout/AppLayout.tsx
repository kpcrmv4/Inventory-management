import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'
import { BranchProvider } from '../../app/providers/BranchProvider'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BranchProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6 bg-pattern">
            <div className="animate-fade-in-up">
              <Outlet />
            </div>
          </main>

          <BottomNav onMoreClick={() => setSidebarOpen(true)} />
        </div>
      </div>
    </BranchProvider>
  )
}
