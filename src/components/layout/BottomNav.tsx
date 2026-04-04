import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Receipt, BookOpen, MoreHorizontal,
} from 'lucide-react'

interface BottomNavProps {
  onMoreClick: () => void
}

const items = [
  { to: '/app/dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
  { to: '/app/inventory/receiving', label: 'รับของเข้า', icon: Package },
  { to: '/app/pl/daily-sale', label: 'ยอดขาย', icon: Receipt },
  { to: '/app/recipes', label: 'สูตรอาหาร', icon: BookOpen },
]

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const location = useLocation()

  // Check if "more" should appear active (current path not in the 4 main items)
  const isMoreActive = !items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
  )

  return (
    <div className="btm-nav btm-nav-sm lg:hidden border-t border-base-300 z-30">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            isActive ? 'active text-primary' : 'text-base-content/60'
          }
        >
          <item.icon size={20} />
          <span className="btm-nav-label text-[10px]">{item.label}</span>
        </NavLink>
      ))}
      <button
        className={isMoreActive ? 'active text-primary' : 'text-base-content/60'}
        onClick={onMoreClick}
      >
        <MoreHorizontal size={20} />
        <span className="btm-nav-label text-[10px]">เพิ่มเติม</span>
      </button>
    </div>
  )
}
