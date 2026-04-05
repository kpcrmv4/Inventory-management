import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Receipt, MoreHorizontal,
  ChefHat, Settings, LayoutGrid,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface BottomNavProps {
  onMoreClick: () => void
}

const appLeftItems = [
  { to: '/app/dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
  { to: '/app/inventory/receiving', label: 'รับของเข้า', icon: Package },
]

const appRightItems = [
  { to: '/app/pl/daily-sale', label: 'ยอดขาย', icon: Receipt },
]

const appCenterItem = { to: '/app/inventory/main-table', label: 'คลังสินค้า', icon: LayoutGrid }

const superAdminItems = [
  { to: '/superadmin/dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
  { to: '/superadmin/tenants', label: 'จัดการร้าน', icon: ChefHat },
  { to: '/superadmin/settings', label: 'ตั้งค่า', icon: Settings },
]

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<any> }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 ${
          isActive
            ? 'text-primary'
            : 'text-base-content/40'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.3 : 1.6} />
          <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const location = useLocation()
  const { profile } = useAuth()

  const isSuperAdmin = profile?.role === 'superadmin'

  if (isSuperAdmin) {
    return (
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 border-t border-base-200/80 bg-base-100/90 glass-effect safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {superAdminItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </div>
    )
  }

  const allItems = [...appLeftItems, appCenterItem, ...appRightItems]
  const isMoreActive = !allItems.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
  )
  const isCenterActive = location.pathname === appCenterItem.to || location.pathname.startsWith(appCenterItem.to + '/')

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 bg-base-100/90 glass-effect safe-area-bottom">
      <div className="flex items-center h-16 relative">
        {/* Left 2 items */}
        {appLeftItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* Center floating button */}
        <div className="flex-1 flex flex-col items-center justify-end h-full pb-1.5">
          <NavLink
            to={appCenterItem.to}
            className="bottom-nav-center-btn -mt-7"
          >
            <appCenterItem.icon size={26} strokeWidth={2} />
          </NavLink>
          <span className={`text-[10px] leading-tight mt-1 ${
            isCenterActive ? 'text-primary font-bold' : 'text-base-content/40 font-medium'
          }`}>
            {appCenterItem.label}
          </span>
        </div>

        {/* Right item */}
        {appRightItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* More button */}
        <button
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 ${
            isMoreActive ? 'text-primary' : 'text-base-content/40'
          }`}
          onClick={onMoreClick}
        >
          <MoreHorizontal size={22} strokeWidth={isMoreActive ? 2.3 : 1.6} />
          <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-bold' : 'font-medium'}`}>
            เพิ่มเติม
          </span>
        </button>
      </div>
    </div>
  )
}
