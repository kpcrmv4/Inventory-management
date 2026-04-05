import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Receipt, BookOpen, MoreHorizontal,
  ChefHat, Settings,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface BottomNavProps {
  onMoreClick: () => void
}

const appItems = [
  { to: '/app/dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
  { to: '/app/inventory/receiving', label: 'รับของเข้า', icon: Package },
  { to: '/app/pl/daily-sale', label: 'ยอดขาย', icon: Receipt },
  { to: '/app/recipes', label: 'สูตรอาหาร', icon: BookOpen },
]

const superAdminItems = [
  { to: '/superadmin/dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
  { to: '/superadmin/tenants', label: 'จัดการร้าน', icon: ChefHat },
  { to: '/superadmin/settings', label: 'ตั้งค่า', icon: Settings },
]

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const location = useLocation()
  const { profile } = useAuth()

  const isSuperAdmin = profile?.role === 'superadmin'
  const items = isSuperAdmin ? superAdminItems : appItems

  const isMoreActive = !items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 border-t border-base-200/80 bg-base-100/85 glass-effect safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav-item flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 ${
                isActive
                  ? 'active text-primary'
                  : 'text-base-content/40 active:text-base-content/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-primary/10' : ''
                }`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        {!isSuperAdmin && (
          <button
            className={`bottom-nav-item flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 ${
              isMoreActive
                ? 'active text-primary'
                : 'text-base-content/40 active:text-base-content/70'
            }`}
            onClick={onMoreClick}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${
              isMoreActive ? 'bg-primary/10' : ''
            }`}>
              <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
              เพิ่มเติม
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
