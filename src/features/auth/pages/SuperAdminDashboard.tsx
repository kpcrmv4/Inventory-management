import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Clock,
  CheckCircle,
  Ban,
  Users,
  ArrowRight,
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
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">SuperAdmin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat bg-base-100 shadow rounded-box">
          <div className="stat-figure text-primary">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="stat-title">Tenant ทั้งหมด</div>
          <div className="stat-value text-primary">{stats.total}</div>
        </div>

        <div className="stat bg-base-100 shadow rounded-box">
          <div className="stat-figure text-warning">
            <Clock className="w-8 h-8" />
          </div>
          <div className="stat-title">รอการอนุมัติ</div>
          <div className="stat-value text-warning">{stats.pending}</div>
        </div>

        <div className="stat bg-base-100 shadow rounded-box">
          <div className="stat-figure text-success">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title">ใช้งานอยู่</div>
          <div className="stat-value text-success">{stats.active}</div>
        </div>

        <div className="stat bg-base-100 shadow rounded-box">
          <div className="stat-figure text-error">
            <Ban className="w-8 h-8" />
          </div>
          <div className="stat-title">ถูกระงับ</div>
          <div className="stat-value text-error">{stats.suspended}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">
            <Users className="w-5 h-5" />
            การจัดการ
          </h2>

          {stats.pending > 0 && (
            <div className="alert alert-warning mb-4">
              <Clock className="w-5 h-5" />
              <span>
                มี {stats.pending} Tenant รอการอนุมัติ
              </span>
            </div>
          )}

          <Link
            to="/superadmin/tenants"
            className="btn btn-primary btn-outline gap-2"
          >
            จัดการ Tenant
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
