import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle,
  Ban,
  Clock,
  Search,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'
import { formatThaiDate } from '../../../lib/date-utils'
import type { TenantStatus, PlanType } from '../../../types/database'

interface TenantRow {
  id: string
  name: string
  plan: PlanType
  status: TenantStatus
  approved_at: string | null
  expires_at: string | null
  created_at: string
}

const STATUS_BADGE: Record<TenantStatus, string> = {
  pending: 'badge-warning',
  active: 'badge-success',
  suspended: 'badge-error',
}

const STATUS_LABEL: Record<TenantStatus, string> = {
  pending: 'รอดำเนินการ',
  active: 'ใช้งาน',
  suspended: 'ถูกระงับ',
}

export default function TenantManagement() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TenantStatus | ''>('')

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, plan, status, approved_at, expires_at, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenants(data ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function approveTenant(tenantId: string) {
    try {
      const now = new Date().toISOString()
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          approved_at: now,
          approved_by: user?.id ?? null,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', tenantId)

      if (error) throw error
      showSuccess('อนุมัติ Tenant สำเร็จ')
      fetchTenants()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    }
  }

  async function suspendTenant(tenantId: string) {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: 'suspended' })
        .eq('id', tenantId)

      if (error) throw error
      showSuccess('ระงับ Tenant สำเร็จ')
      fetchTenants()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    }
  }

  async function reactivateTenant(tenantId: string) {
    try {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', tenantId)

      if (error) throw error
      showSuccess('เปิดใช้งาน Tenant อีกครั้งสำเร็จ')
      fetchTenants()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    }
  }

  const filtered = tenants.filter((t) => {
    const matchSearch =
      !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || t.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          จัดการ Tenant
        </h1>
        <button className="btn btn-ghost btn-sm" onClick={fetchTenants}>
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input
            type="text"
            className="input input-bordered w-full pl-10"
            placeholder="ค้นหาชื่อร้าน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select select-bordered"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TenantStatus | '')}
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="active">ใช้งาน</option>
          <option value="suspended">ถูกระงับ</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          ไม่พบข้อมูล Tenant
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ชื่อร้าน</th>
                <th>แผน</th>
                <th>สถานะ</th>
                <th>วันที่สมัคร</th>
                <th>วันที่อนุมัติ</th>
                <th>หมดอายุ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td>
                    <span
                      className={`badge badge-sm ${
                        t.plan === 'pro' ? 'badge-secondary' : 'badge-ghost'
                      }`}
                    >
                      {t.plan === 'pro' ? 'Pro' : 'Standard'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${STATUS_BADGE[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="text-sm">{formatThaiDate(t.created_at)}</td>
                  <td className="text-sm">
                    {t.approved_at ? formatThaiDate(t.approved_at) : '-'}
                  </td>
                  <td className="text-sm">
                    {t.expires_at ? formatThaiDate(t.expires_at) : '-'}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {t.status === 'pending' && (
                        <button
                          className="btn btn-success btn-xs gap-1"
                          onClick={() => approveTenant(t.id)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          อนุมัติ
                        </button>
                      )}
                      {t.status === 'active' && (
                        <button
                          className="btn btn-error btn-xs gap-1"
                          onClick={() => suspendTenant(t.id)}
                        >
                          <Ban className="w-3 h-3" />
                          ระงับ
                        </button>
                      )}
                      {t.status === 'suspended' && (
                        <button
                          className="btn btn-warning btn-xs gap-1"
                          onClick={() => reactivateTenant(t.id)}
                        >
                          <Clock className="w-3 h-3" />
                          เปิดใช้งาน
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
