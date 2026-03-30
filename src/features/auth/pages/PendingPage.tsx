import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { showInfo } from '../../../lib/toast'

export default function PendingPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<string>('pending')

  // If profile is already active, redirect
  useEffect(() => {
    if (profile) {
      checkTenantStatus()
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function checkTenantStatus() {
    if (!profile?.tenant_id) return
    setChecking(true)
    try {
      const { data } = await supabase
        .from('tenants')
        .select('status')
        .eq('id', profile.tenant_id)
        .single()

      if (data) {
        setStatus(data.status)
        if (data.status === 'active') {
          showInfo('บัญชีของคุณได้รับการอนุมัติแล้ว')
          navigate('/app/dashboard', { replace: true })
        }
      }
    } finally {
      setChecking(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <Clock className="w-16 h-16 text-warning" />
      </div>

      <h1 className="text-2xl font-bold mb-2">รอการอนุมัติ</h1>

      <p className="text-base-content/70 mb-6">
        บัญชีของคุณอยู่ระหว่างการตรวจสอบโดย Admin
        <br />
        กรุณารอสักครู่ เราจะแจ้งให้ทราบเมื่อได้รับการอนุมัติ
      </p>

      {user && (
        <p className="text-sm text-base-content/50 mb-4">
          อีเมล: {user.email}
        </p>
      )}

      <div className="badge badge-lg mb-6">
        {status === 'pending' && (
          <span className="badge badge-warning gap-1">
            <Clock className="w-3 h-3" /> รอดำเนินการ
          </span>
        )}
        {status === 'suspended' && (
          <span className="badge badge-error">ถูกระงับ</span>
        )}
        {status === 'active' && (
          <span className="badge badge-success">อนุมัติแล้ว</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="btn btn-outline btn-primary"
          onClick={checkTenantStatus}
          disabled={checking}
        >
          {checking ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          ตรวจสอบสถานะ
        </button>

        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  )
}
