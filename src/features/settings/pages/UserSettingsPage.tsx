import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, ToggleLeft, ToggleRight, Shield, UserCircle,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { useBranch } from '../../../hooks/useBranch'
import { showSuccess, showError, showWarning } from '../../../lib/toast'
import type { UserRole } from '../../../types/database'

interface TenantUser {
  id: string
  full_name: string
  role: UserRole
  branch_id: string | null
  is_active: boolean
  branch_name?: string
}

export default function UserSettingsPage() {
  const { profile } = useAuth()
  const { branches } = useBranch()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formBranchId, setFormBranchId] = useState('')

  const fetchUsers = useCallback(async () => {
    if (!profile?.tenant_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, branch_id, is_active')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Map branch names
      const branchMap: Record<string, string> = {}
      for (const b of branches) {
        branchMap[b.id] = b.name
      }

      const enriched: TenantUser[] = (data ?? []).map((u: any) => ({
        ...u,
        branch_name: u.branch_id ? branchMap[u.branch_id] : undefined,
      }))

      setUsers(enriched)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      showError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้')
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id, branches])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleInviteStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) { showWarning('กรุณากรอกชื่อ'); return }
    if (!formEmail.trim()) { showWarning('กรุณากรอกอีเมล'); return }
    if (!formPassword || formPassword.length < 6) { showWarning('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (!formBranchId) { showWarning('กรุณาเลือกสาขา'); return }
    if (!profile?.tenant_id) return

    setSubmitting(true)
    try {
      // Create auth user via Supabase
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formEmail.trim(),
        password: formPassword,
        email_confirm: true,
        user_metadata: { full_name: formName.trim() },
      })

      if (authError) throw authError

      // Insert user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            tenant_id: profile.tenant_id,
            branch_id: formBranchId,
            role: 'staff' as UserRole,
            full_name: formName.trim(),
            is_active: true,
          } as never)

        if (profileError) throw profileError
      }

      showSuccess('เพิ่มพนักงานสำเร็จ')
      setFormName('')
      setFormEmail('')
      setFormPassword('')
      setFormBranchId('')
      setShowForm(false)
      fetchUsers()
    } catch (err: any) {
      console.error('Failed to invite staff:', err)
      showError(err?.message ?? 'ไม่สามารถเพิ่มพนักงานได้')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleUserActive(userId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentActive } as never)
        .eq('id', userId)

      if (error) throw error
      showSuccess(currentActive ? 'ปิดการใช้งานสำเร็จ' : 'เปิดการใช้งานสำเร็จ')
      fetchUsers()
    } catch (err) {
      console.error('Failed to toggle user:', err)
      showError('ไม่สามารถอัปเดตสถานะได้')
    }
  }

  function getRoleBadge(role: UserRole) {
    switch (role) {
      case 'owner':
        return <span className="badge badge-primary badge-sm gap-1"><Shield size={10} /> Owner</span>
      case 'staff':
        return <span className="badge badge-info badge-sm gap-1"><UserCircle size={10} /> Staff</span>
      case 'superadmin':
        return <span className="badge badge-warning badge-sm gap-1"><Shield size={10} /> SuperAdmin</span>
      default:
        return <span className="badge badge-ghost badge-sm">{role}</span>
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="text-primary" size={28} />
          <div>
            <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
            <p className="text-sm text-base-content/60">
              ทั้งหมด {users.length} คน
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm gap-1"
          onClick={() => setShowForm(prev => !prev)}
        >
          <Plus size={16} />
          เพิ่มพนักงาน
        </button>
      </div>

      {/* Invite Form */}
      {showForm && (
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-base">เพิ่มพนักงานใหม่</h3>
            <form onSubmit={handleInviteStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">ชื่อ-นามสกุล *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    placeholder="ชื่อ นามสกุล"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">อีเมล *</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered input-sm w-full"
                    placeholder="email@example.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">รหัสผ่าน *</span>
                  </label>
                  <input
                    type="password"
                    className="input input-bordered input-sm w-full"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">สาขา *</span>
                  </label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={formBranchId}
                    onChange={e => setFormBranchId(e.target.value)}
                    required
                  >
                    <option value="">เลือกสาขา</option>
                    {branches.filter(b => b.is_active).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowForm(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  {submitting && <span className="loading loading-spinner loading-xs"></span>}
                  เพิ่มพนักงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Empty */}
      {!loading && users.length === 0 && (
        <div className="text-center py-12 text-base-content/50">
          ยังไม่มีผู้ใช้ในระบบ
        </div>
      )}

      {/* User List */}
      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="bg-base-200">
                <th>ชื่อ</th>
                <th>บทบาท</th>
                <th>สาขา</th>
                <th>สถานะ</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                  <td>
                    <div className="flex items-center gap-2">
                      <UserCircle size={18} className="text-base-content/40" />
                      <span className="font-medium">{user.full_name}</span>
                    </div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td className="text-sm text-base-content/60">
                    {user.branch_name ?? (user.role === 'owner' ? 'ทุกสาขา' : '-')}
                  </td>
                  <td>
                    {user.is_active ? (
                      <span className="badge badge-success badge-sm">ใช้งาน</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">ปิด</span>
                    )}
                  </td>
                  <td>
                    {/* Don't allow toggling own account or owner accounts */}
                    {user.id !== profile?.id && user.role !== 'owner' && (
                      <button
                        className={`btn btn-xs btn-ghost ${
                          user.is_active ? 'text-success' : 'text-base-content/50'
                        }`}
                        onClick={() => toggleUserActive(user.id, user.is_active)}
                      >
                        {user.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    )}
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
