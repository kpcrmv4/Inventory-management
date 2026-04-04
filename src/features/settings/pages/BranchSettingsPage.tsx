import { useState, useEffect } from 'react'
import {
  Building2, Plus, ToggleLeft, ToggleRight, ArrowUpCircle,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { useBranch } from '../../../hooks/useBranch'
import { showSuccess, showError, showWarning } from '../../../lib/toast'
import { MAX_BRANCHES_STANDARD, MAX_BRANCHES_PRO } from '../../../lib/constants'
// formatThaiDate available if needed
// import { formatThaiDate } from '../../../lib/date-utils'

export default function BranchSettingsPage() {
  const { profile } = useAuth()
  const { branches, refetchBranches } = useBranch()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tenantPlan, setTenantPlan] = useState<'standard' | 'pro' | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  // Fetch tenant plan
  useEffect(() => {
    async function fetchPlan() {
      if (!profile?.tenant_id) {
        setPlanLoading(false)
        return
      }
      try {
        const { data } = await supabase
          .from('tenants')
          .select('plan')
          .eq('id', profile.tenant_id)
          .single()
        setTenantPlan((data as any)?.plan ?? 'standard')
      } catch {
        // fallback
      } finally {
        setPlanLoading(false)
      }
    }
    fetchPlan()
  }, [profile?.tenant_id])

  const maxBranches = tenantPlan === 'pro' ? MAX_BRANCHES_PRO : MAX_BRANCHES_STANDARD
  const canAddBranch = branches.length < maxBranches

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) {
      showWarning('กรุณากรอกชื่อสาขา')
      return
    }
    if (!canAddBranch) {
      showWarning(`แผน ${tenantPlan} รองรับสูงสุด ${maxBranches} สาขา`)
      return
    }
    if (!profile?.tenant_id) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('branches')
        .insert({
          tenant_id: profile.tenant_id,
          name: formName.trim(),
          address: formAddress.trim() || null,
          is_active: true,
        } as never)

      if (error) throw error
      showSuccess('เพิ่มสาขาสำเร็จ')
      setFormName('')
      setFormAddress('')
      setShowForm(false)
      refetchBranches()
    } catch (err) {
      console.error('Failed to add branch:', err)
      showError('ไม่สามารถเพิ่มสาขาได้')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleBranchActive(branchId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: !currentActive } as never)
        .eq('id', branchId)

      if (error) throw error
      showSuccess(currentActive ? 'ปิดสาขาสำเร็จ' : 'เปิดสาขาสำเร็จ')
      refetchBranches()
    } catch (err) {
      console.error('Failed to toggle branch:', err)
      showError('ไม่สามารถอัปเดตสถานะสาขาได้')
    }
  }

  if (planLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="text-primary" size={28} />
          <div>
            <h1 className="text-2xl font-bold">จัดการสาขา</h1>
            <p className="text-sm text-base-content/60">
              {branches.length} / {maxBranches} สาขา | แผน {tenantPlan === 'pro' ? 'Pro' : 'Standard'}
            </p>
          </div>
        </div>

        {canAddBranch && (
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={() => setShowForm(prev => !prev)}
          >
            <Plus size={16} />
            เพิ่มสาขา
          </button>
        )}
      </div>

      {/* Plan limit warning for Standard */}
      {tenantPlan === 'standard' && branches.length >= MAX_BRANCHES_STANDARD && (
        <div className="alert alert-warning">
          <ArrowUpCircle size={20} />
          <div>
            <h3 className="font-bold">แผน Standard รองรับ 1 สาขา</h3>
            <p className="text-sm">อัปเกรดเป็น Pro เพื่อเพิ่มสาขาได้สูงสุด 5 สาขา</p>
          </div>
          <button className="btn btn-sm btn-warning">อัปเกรด</button>
        </div>
      )}

      {/* Add Branch Form */}
      {showForm && canAddBranch && (
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-base">เพิ่มสาขาใหม่</h3>
            <form onSubmit={handleAddBranch} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">ชื่อสาขา *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="เช่น สาขาสยาม"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">ที่อยู่</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  placeholder="ที่อยู่สาขา (ไม่บังคับ)"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                />
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
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch List */}
      {branches.length === 0 && (
        <div className="text-center py-12 text-base-content/50">
          ยังไม่มีสาขา
        </div>
      )}

      {branches.length > 0 && (
        <div className="space-y-3">
          {branches.map(branch => (
            <div
              key={branch.id}
              className={`card bg-base-100 shadow-sm border ${
                branch.is_active ? 'border-base-300' : 'border-base-300 opacity-60'
              }`}
            >
              <div className="card-body p-4 flex-row items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className={branch.is_active ? 'text-primary' : 'text-base-content/30'} />
                    <span className="font-medium">{branch.name}</span>
                    {branch.is_active ? (
                      <span className="badge badge-success badge-sm">เปิด</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">ปิด</span>
                    )}
                  </div>
                </div>

                <button
                  className={`btn btn-sm btn-ghost gap-1 ${
                    branch.is_active ? 'text-success' : 'text-base-content/50'
                  }`}
                  onClick={() => toggleBranchActive(branch.id, branch.is_active)}
                  title={branch.is_active ? 'ปิดสาขา' : 'เปิดสาขา'}
                >
                  {branch.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  {branch.is_active ? 'ปิด' : 'เปิด'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
