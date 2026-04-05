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
    <nav className="navbar bg-base-100/80 glass-effect border-b border-base-200/60 px-4 sticky top-0 z-30">
      <div className="flex-none lg:hidden">
        <button
          className="btn btn-ghost btn-circle hover:bg-primary/10"
          onClick={onMenuClick}
          aria-label="เปิดเมนู"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2">
          <div className="icon-box-sm bg-gradient-brand text-white rounded-lg">
            <span className="text-xs font-bold">IV</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {profile?.full_name}
          </span>
          <span className="text-[10px] text-base-content/40">
            {profile?.role === 'owner' ? 'เจ้าของร้าน' : profile?.role === 'staff' ? 'พนักงาน' : profile?.role}
          </span>
        </div>
        {profile?.role !== 'superadmin' && (
          <BranchSwitcher />
        )}
      </div>

      <div className="flex-none flex items-center gap-1">
        <ThemeToggle />
        {profile && (
          <button
            className="btn btn-ghost btn-circle hover:bg-error/10 hover:text-error transition-colors"
            onClick={() => signOut()}
            aria-label="ออกจากระบบ"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </nav>
  )
}
