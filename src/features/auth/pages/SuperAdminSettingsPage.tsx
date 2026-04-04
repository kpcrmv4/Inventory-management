import { useEffect, useState } from 'react'
import {
  Shield,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  User,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'

export default function SuperAdminSettingsPage() {
  const { user, profile } = useAuth()

  // Change password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Profile info
  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
    }
  }, [profile])

  async function handleUpdateProfile() {
    if (!fullName.trim()) {
      showError('กรุณากรอกชื่อ')
      return
    }
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName.trim() })
        .eq('id', profile?.id)

      if (error) throw error
      showSuccess('บันทึกข้อมูลสำเร็จ')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      showError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (newPassword !== confirmPassword) {
      showError('รหัสผ่านไม่ตรงกัน')
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      showSuccess('เปลี่ยนรหัสผ่านสำเร็จ')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-base-content">
        ตั้งค่าระบบ
      </h1>

      {/* Account info */}
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="text-primary" size={20} />
          <h2 className="text-base sm:text-lg font-semibold">ข้อมูลบัญชี</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-base-200/50 p-3">
            <Mail className="text-base-content/50 shrink-0" size={18} />
            <div>
              <p className="text-xs text-base-content/50">อีเมล</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-base-200/50 p-3">
            <Shield className="text-base-content/50 shrink-0" size={18} />
            <div>
              <p className="text-xs text-base-content/50">บทบาท</p>
              <p className="text-sm font-medium">SuperAdmin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Update profile */}
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User className="text-secondary" size={20} />
          <h2 className="text-base sm:text-lg font-semibold">แก้ไขข้อมูลส่วนตัว</h2>
        </div>

        <div className="space-y-3">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-sm">ชื่อ-นามสกุล</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="กรอกชื่อ-นามสกุล"
            />
          </label>

          <button
            className="btn btn-secondary btn-sm gap-2"
            onClick={handleUpdateProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Save size={16} />
            )}
            บันทึก
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="text-warning" size={20} />
          <h2 className="text-base sm:text-lg font-semibold">เปลี่ยนรหัสผ่าน</h2>
        </div>

        <div className="space-y-3">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-sm">รหัสผ่านใหม่</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input input-bordered w-full pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-sm">ยืนยันรหัสผ่านใหม่</span>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input input-bordered w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
            />
          </label>

          <button
            className="btn btn-warning btn-sm gap-2"
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
          >
            {savingPassword ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <KeyRound size={16} />
            )}
            เปลี่ยนรหัสผ่าน
          </button>
        </div>
      </div>
    </div>
  )
}
