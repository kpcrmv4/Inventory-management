import { Menu, LogOut } from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { BranchSwitcher } from './BranchSwitcher'
import { useAuth } from '../../hooks/useAuth'

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, signOut } = useAuth()

  return (
    <nav className="navbar bg-base-100 border-b border-base-300 px-4">
      <div className="flex-none lg:hidden">
        <button
          className="btn btn-ghost btn-circle"
          onClick={onMenuClick}
          aria-label="เปิดเมนู"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-sm text-base-content/60">
          {profile?.full_name}
        </span>
        {profile?.role !== 'superadmin' && (
          <BranchSwitcher />
        )}
      </div>

      <div className="flex-none flex items-center gap-1">
        <ThemeToggle />
        {profile && (
          <button
            className="btn btn-ghost btn-circle"
            onClick={() => signOut()}
            aria-label="ออกจากระบบ"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </nav>
  )
}
