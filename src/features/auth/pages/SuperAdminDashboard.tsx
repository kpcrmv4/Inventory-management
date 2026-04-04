import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Clock,
  CheckCircle,
  Ban,
  Users,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { showError } from '../../../lib/toast'

interface TenantStats {
  pending: number
  active: number
  suspended: number
  total: number
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<TenantStats>({
    pending: 0,
    active: 0,
    suspended: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('status')

      if (error) throw error

      const counts: TenantStats = { pending: 0, active: 0, suspended: 0, total: 0 }
      for (const t of data ?? []) {
        counts.total++
        if (t.status === 'pending') counts.pending++
        else if (t.status === 'active') counts.active++
        else if (t.status === 'suspended') counts.suspended++
      }
      setStats(counts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  const statCards = [
    {
      label: 'Tenant ทั้งหมด',
      value: stats.total,
      icon: Building2,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'รอการอนุมัติ',
      value: stats.pending,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'ใช้งานอยู่',
      value: stats.active,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'ถูกระงับ',
      value: stats.suspended,
      icon: Ban,
      color: 'text-error',
      bg: 'bg-error/10',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">
          SuperAdmin Dashboard
        </h1>
        <button
          className="btn btn-ghost btn-sm btn-circle"
          onClick={fetchStats}
          aria-label="รีเฟรช"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats cards - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm text-base-content/60 font-medium">
                {card.label}
              </span>
              <div className={`${card.bg} ${card.color} rounded-xl p-2`}>
                <card.icon size={20} />
              </div>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {stats.pending > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <Clock className="text-warning shrink-0" size={22} />
          <p className="text-sm sm:text-base text-base-content flex-1">
            มี <span className="font-semibold">{stats.pending}</span> Tenant รอการอนุมัติ
          </p>
          <Link
            to="/superadmin/tenants"
            className="btn btn-warning btn-sm gap-1"
          >
            ดู
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-base-content/70" size={20} />
          <h2 className="text-base sm:text-lg font-semibold text-base-content">
            การจัดการ
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/superadmin/tenants"
            className="flex items-center justify-between rounded-xl border border-base-300 bg-base-200/50 p-4 hover:bg-base-200 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary rounded-lg p-2">
                <Building2 size={20} />
              </div>
              <div>
                <p className="font-medium text-sm sm:text-base">จัดการ Tenant</p>
                <p className="text-xs text-base-content/50">อนุมัติ / ระงับ / ดูรายละเอียด</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-base-content/30 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            to="/superadmin/settings"
            className="flex items-center justify-between rounded-xl border border-base-300 bg-base-200/50 p-4 hover:bg-base-200 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-secondary/10 text-secondary rounded-lg p-2">
                <Users size={20} />
              </div>
              <div>
                <p className="font-medium text-sm sm:text-base">ตั้งค่าระบบ</p>
                <p className="text-xs text-base-content/50">ตั้งค่า SuperAdmin</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-base-content/30 group-hover:text-secondary transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}
