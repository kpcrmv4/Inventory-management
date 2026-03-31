import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { showError, showSuccess } from '../../../lib/toast'
import type { PlanType } from '../../../types/database'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [storeName, setStoreName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState<PlanType>('standard')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeName || !fullName || !email || !password) {
      showError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    if (password.length < 6) {
      showError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    setSubmitting(true)
    try {
      // SignUp with metadata — auth trigger จะสร้าง tenant + branch + user ให้อัตโนมัติ
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            store_name: storeName,
            plan,
          },
        },
      })

      if (error) {
        // แปลง error messages เป็นภาษาไทย
        if (error.message.includes('already registered')) {
          showError('อีเมลนี้ถูกใช้งานแล้ว')
        } else if (error.status === 429) {
          showError('คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่')
        } else {
          showError(error.message)
        }
        return
      }

      showSuccess('สมัครสมาชิกสำเร็จ! กรุณารอการอนุมัติจาก Admin')
      navigate('/pending')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">สมัครสมาชิก</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">ชื่อร้าน / บริษัท</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="เช่น ร้านอาหาร ABC"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">ชื่อ-นามสกุล</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="ชื่อ นามสกุล"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">อีเมล</span>
          </label>
          <input
            type="email"
            className="input input-bordered w-full"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">รหัสผ่าน</span>
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input input-bordered w-full pr-10"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
              onClick={() => setShowPw(!showPw)}
              tabIndex={-1}
            >
              {showPw ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">แผนบริการ</span>
          </label>
          <div className="flex gap-3">
            <label
              className={`flex-1 cursor-pointer border-2 rounded-lg p-4 text-center transition ${
                plan === 'standard'
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300'
              }`}
            >
              <input
                type="radio"
                name="plan"
                value="standard"
                checked={plan === 'standard'}
                onChange={() => setPlan('standard')}
                className="hidden"
              />
              <div className="font-bold">Standard</div>
              <div className="text-xs text-base-content/60 mt-1">1 สาขา</div>
            </label>
            <label
              className={`flex-1 cursor-pointer border-2 rounded-lg p-4 text-center transition ${
                plan === 'pro'
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300'
              }`}
            >
              <input
                type="radio"
                name="plan"
                value="pro"
                checked={plan === 'pro'}
                onChange={() => setPlan('pro')}
                className="hidden"
              />
              <div className="font-bold">Pro</div>
              <div className="text-xs text-base-content/60 mt-1">
                สูงสุด 5 สาขา
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={submitting}
        >
          {submitting && (
            <span className="loading loading-spinner loading-sm" />
          )}
          สมัครสมาชิก
        </button>
      </form>

      <p className="text-center text-sm mt-4 text-base-content/70">
        มีบัญชีแล้ว?{' '}
        <Link to="/" className="link link-primary">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  )
}
