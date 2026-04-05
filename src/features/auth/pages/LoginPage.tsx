import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { showError } from '../../../lib/toast'

export default function LoginPage() {
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      showError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }
    setSubmitting(true)
    try {
      await signIn(email, password)
      // After sign-in, auth state updates via listener.
      // We redirect based on role once profile is available.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Redirect if already logged in and profile is loaded
  if (profile) {
    if (profile.role === 'superadmin') {
      navigate('/superadmin/dashboard', { replace: true })
    } else {
      navigate('/app/dashboard', { replace: true })
    }
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="icon-box-sm bg-primary/10 text-primary">
          <LogIn size={18} />
        </div>
        <h1 className="text-xl font-bold">เข้าสู่ระบบ</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
              onClick={() => setShowPw(!showPw)}
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={submitting}
        >
          {submitting && <span className="loading loading-spinner loading-sm" />}
          เข้าสู่ระบบ
        </button>
      </form>

      <p className="text-center text-sm mt-4 text-base-content/70">
        ยังไม่มีบัญชี?{' '}
        <Link to="/register" className="link link-primary">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  )
}
