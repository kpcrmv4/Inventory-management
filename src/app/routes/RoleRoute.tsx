import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/database'
import type { ReactNode } from 'react'

interface RoleRouteProps {
  children: ReactNode
  allowed: UserRole[]
}

export function RoleRoute({ children, allowed }: RoleRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!profile || !allowed.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
