import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Receipt, Users, FileText,
  Settings, MessageSquare, X, ChefHat, BookOpen,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/database'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  roles: UserRole[]
}

const appNavItems: NavItem[] = [
  { to: '/app/dashboard', label: 'แดชบอร์ด', icon: <LayoutDashboard size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/inventory/main-table', label: 'คลังวัตถุดิบ', icon: <Package size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/inventory/receiving', label: 'รับของเข้า', icon: <Package size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/inventory/raw-waste', label: 'ของเสีย', icon: <Package size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/inventory/par-stock', label: 'Par Stock', icon: <Package size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/recipes', label: 'สูตรอาหาร', icon: <BookOpen size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/pl/daily-sale', label: 'ยอดขายรายวัน', icon: <Receipt size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/pl/expenses', label: 'ค่าใช้จ่าย', icon: <Receipt size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/pl/report', label: 'งบ P&L', icon: <FileText size={20} />, roles: ['owner'] },
  { to: '/app/pl/labor/ft', label: 'พนักงาน FT', icon: <Users size={20} />, roles: ['owner'] },
  { to: '/app/pl/labor/pt', label: 'พนักงาน PT', icon: <Users size={20} />, roles: ['owner'] },
  { to: '/app/pl/labor/hq', label: 'ทีม HQ', icon: <Users size={20} />, roles: ['owner'] },
  { to: '/app/complaints', label: 'ข้อร้องเรียน', icon: <MessageSquare size={20} />, roles: ['owner', 'staff'] },
  { to: '/app/settings/branches', label: 'จัดการสาขา', icon: <Settings size={20} />, roles: ['owner'] },
  { to: '/app/settings/users', label: 'จัดการผู้ใช้', icon: <Settings size={20} />, roles: ['owner'] },
]

const superAdminNavItems: NavItem[] = [
  { to: '/superadmin/dashboard', label: 'แดชบอร์ด', icon: <LayoutDashboard size={20} />, roles: ['superadmin'] },
  { to: '/superadmin/tenants', label: 'จัดการร้าน', icon: <ChefHat size={20} />, roles: ['superadmin'] },
  { to: '/superadmin/settings', label: 'ตั้งค่า', icon: <Settings size={20} />, roles: ['superadmin'] },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile } = useAuth()
  const role = profile?.role

  const navItems = role === 'superadmin' ? superAdminNavItems : appNavItems
  const visibleItems = navItems.filter(item => role && item.roles.includes(role))

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-base-200 border-r border-base-300
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <span className="font-bold text-lg">Inventory</span>
          <button
            className="btn btn-ghost btn-sm btn-circle lg:hidden"
            onClick={onClose}
            aria-label="ปิดเมนู"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-2 overflow-y-auto h-[calc(100%-64px)]">
          <ul className="menu menu-sm gap-1">
            {visibleItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    isActive ? 'active font-medium' : ''
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
