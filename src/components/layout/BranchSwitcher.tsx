import { Building2, ChevronDown } from 'lucide-react'
import { useBranch } from '../../hooks/useBranch'
import { useAuth } from '../../hooks/useAuth'

export function BranchSwitcher() {
  const { branches, activeBranch, setActiveBranch } = useBranch()
  const { profile } = useAuth()

  // Staff can only access assigned branch — no switcher needed
  if (profile?.role === 'staff') {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/70">
        <Building2 size={16} />
        <span>{activeBranch?.name ?? 'ไม่มีสาขา'}</span>
      </div>
    )
  }

  // Owner with single branch — show label only
  if (branches.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/70">
        <Building2 size={16} />
        <span>{activeBranch?.name ?? 'ไม่มีสาขา'}</span>
      </div>
    )
  }

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm gap-2">
        <Building2 size={16} />
        <span className="max-w-[120px] truncate">{activeBranch?.name ?? 'เลือกสาขา'}</span>
        <ChevronDown size={14} />
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-56 border border-base-300"
      >
        {branches.map(branch => (
          <li key={branch.id}>
            <button
              className={activeBranch?.id === branch.id ? 'active' : ''}
              onClick={() => setActiveBranch(branch)}
            >
              <Building2 size={14} />
              <span className="truncate">{branch.name}</span>
              {!branch.is_active && (
                <span className="badge badge-ghost badge-xs">ปิด</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
