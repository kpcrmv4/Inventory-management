import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Receipt, Users, FileText,
  Settings, MessageSquare, X, ChefHat, BookOpen, PieChart,
  PackagePlus, Trash2, BarChart3, Wallet, ClipboardList,
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
  group: string
}

const appNavItems: NavItem[] = [
  { to: '/app/dashboard', label: 'แดชบอร์ด', icon: <LayoutDashboard size={18} />, roles: ['owner', 'staff'], group: 'main' },
  { to: '/app/inventory/main-table', label: 'คลังวัตถุดิบ', icon: <Package size={18} />, roles: ['owner', 'staff'], group: 'inventory' },
  { to: '/app/inventory/receiving', label: 'รับของเข้า', icon: <PackagePlus size={18} />, roles: ['owner', 'staff'], group: 'inventory' },
  { to: '/app/inventory/raw-waste', label: 'ของเสีย', icon: <Trash2 size={18} />, roles: ['owner', 'staff'], group: 'inventory' },
  { to: '/app/inventory/par-stock', label: 'Par Stock', icon: <BarChart3 size={18} />, roles: ['owner', 'staff'], group: 'inventory' },
  { to: '/app/recipes', label: 'สูตรอาหาร', icon: <BookOpen size={18} />, roles: ['owner', 'staff'], group: 'recipes' },
  { to: '/app/recipes/dashboard', label: 'ภาพรวมต้นทุนเมนู', icon: <PieChart size={18} />, roles: ['owner'], group: 'recipes' },
  { to: '/app/pl/daily-sale', label: 'ยอดขายรายวัน', icon: <Receipt size={18} />, roles: ['owner', 'staff'], group: 'finance' },
  { to: '/app/pl/expenses', label: 'ค่าใช้จ่าย', icon: <Wallet size={18} />, roles: ['owner', 'staff'], group: 'finance' },
  { to: '/app/pl/report', label: 'งบ P&L', icon: <FileText size={18} />, roles: ['owner'], group: 'finance' },
  { to: '/app/pl/labor/ft', label: 'พนักงาน FT', icon: <Users size={18} />, roles: ['owner'], group: 'labor' },
  { to: '/app/pl/labor/pt', label: 'พนักงาน PT', icon: <Users size={18} />, roles: ['owner'], group: 'labor' },
  { to: '/app/pl/labor/hq', label: 'ทีม HQ', icon: <Users size={18} />, roles: ['owner'], group: 'labor' },
  { to: '/app/complaints', label: 'ข้อร้องเรียน', icon: <MessageSquare size={18} />, roles: ['owner', 'staff'], group: 'other' },
  { to: '/app/settings/branches', label: 'จัดการสาขา', icon: <Settings size={18} />, roles: ['owner'], group: 'settings' },
  { to: '/app/settings/users', label: 'จัดการผู้ใช้', icon: <ClipboardList size={18} />, roles: ['owner'], group: 'settings' },
]

const superAdminNavItems: NavItem[] = [
  { to: '/superadmin/dashboard', label: 'แดชบอร์ด', icon: <LayoutDashboard size={18} />, roles: ['superadmin'], group: 'main' },
  { to: '/superadmin/tenants', label: 'จัดการร้าน', icon: <ChefHat size={18} />, roles: ['superadmin'], group: 'main' },
  { to: '/superadmin/settings', label: 'ตั้งค่า', icon: <Settings size={18} />, roles: ['superadmin'], group: 'main' },
]

const GROUP_LABELS: Record<string, string> = {
  main: '',
  inventory: 'คลังสินค้า',
  recipes: 'สูตรอาหาร',
  finance: 'การเงิน',
  labor: 'บุคลากร',
  other: 'อื่นๆ',
  settings: 'ตั้งค่า',
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile } = useAuth()
  const role = profile?.role

  const navItems = role === 'superadmin' ? superAdminNavItems : appNavItems
  const visibleItems = navItems.filter(item => role && item.roles.includes(role))

  const groups: Record<string, typeof visibleItems> = {}
  visibleItems.forEach(item => {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
  })

  const groupKeys = Object.keys(groups)

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-base-100 border-r border-base-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-base-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
                <span className="text-sm font-bold tracking-tight">IV</span>
              </div>
              <div>
                <span className="font-bold text-base">Inventory</span>
                <p className="text-[10px] text-base-content/40 tracking-wider uppercase">Management</p>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-circle lg:hidden"
              onClick={onClose}
              aria-label="ปิดเมนู"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {groupKeys.map((groupKey, gi) => (
            <div key={groupKey} className="mb-1">
              {GROUP_LABELS[groupKey] && (
                <div className="px-3 py-2 mt-2 first:mt-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/35">
                    {GROUP_LABELS[groupKey]}
                  </span>
                </div>
              )}
              <ul className="space-y-0.5">
                {groups[groupKey].map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                          isActive
                            ? 'sidebar-item-active'
                            : 'text-base-content/70 hover:text-base-content hover:bg-base-200/60'
                        }`
                      }
                    >
                      <span className="flex-shrink-0 opacity-75">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
              {gi < groupKeys.length - 1 && GROUP_LABELS[groupKey] && (
                <div className="section-divider mx-3 mt-1" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-base-200">
          <div className="bg-gradient-brand-subtle rounded-xl p-3">
            <p className="text-[10px] text-base-content/50 font-medium">Restaurant Inventory</p>
            <p className="text-[9px] text-base-content/30 mt-0.5">v1.0 SaaS</p>
          </div>
        </div>
      </aside>
    </>
  )
}
