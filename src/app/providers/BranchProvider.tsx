import { createContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Branch {
  id: string
  name: string
  is_active: boolean
}

interface BranchContextValue {
  branches: Branch[]
  activeBranch: Branch | null
  setActiveBranch: (branch: Branch) => void
  loading: boolean
  refetchBranches: () => void
}

export const BranchContext = createContext<BranchContextValue | null>(null)

const STORAGE_KEY = 'activeBranchId'

export function BranchProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBranches = useCallback(async () => {
    if (!profile?.tenant_id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, is_active')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: true })

      if (error) throw error

      const branchList = data ?? []
      setBranches(branchList)

      // Restore saved branch or default to first
      const savedId = localStorage.getItem(STORAGE_KEY)
      const savedBranch = branchList.find(b => b.id === savedId)

      if (savedBranch) {
        setActiveBranchState(savedBranch)
      } else if (branchList.length > 0) {
        setActiveBranchState(branchList[0])
        localStorage.setItem(STORAGE_KEY, branchList[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  // If staff, lock to assigned branch
  useEffect(() => {
    if (profile?.role === 'staff' && profile.branch_id && branches.length > 0) {
      const assigned = branches.find(b => b.id === profile.branch_id)
      if (assigned) {
        setActiveBranchState(assigned)
        localStorage.setItem(STORAGE_KEY, assigned.id)
      }
    }
  }, [profile, branches])

  const setActiveBranch = useCallback((branch: Branch) => {
    setActiveBranchState(branch)
    localStorage.setItem(STORAGE_KEY, branch.id)
  }, [])

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranch,
        setActiveBranch,
        loading,
        refetchBranches: fetchBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}
