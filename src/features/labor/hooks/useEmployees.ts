import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'
import type { EmployeeType } from '../../../types/database'

interface Employee {
  id: string
  tenant_id: string
  branch_id: string
  name: string
  position: string
  salary: number
  type: EmployeeType
  is_active: boolean
  start_date: string
}

interface CreateEmployeeInput {
  name: string
  position: string
  salary: number
  type: EmployeeType
  start_date: string
}

export function useEmployees(branchId: string | null, type: EmployeeType) {
  const { profile } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const effectiveBranchId = branchId

  const fetchEmployees = useCallback(async () => {
    if (!effectiveBranchId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('branch_id', effectiveBranchId)
        .eq('type', type)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      if (data) setEmployees(data)
    } catch (err) {
      showError('ไม่สามารถโหลดข้อมูลพนักงานได้')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [effectiveBranchId, type])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const createEmployee = useCallback(
    async (input: CreateEmployeeInput) => {
      if (!effectiveBranchId || !profile?.tenant_id) return
      try {
        const { error } = await supabase.from('employees').insert({
          tenant_id: profile.tenant_id,
          branch_id: effectiveBranchId,
          name: input.name,
          position: input.position,
          salary: input.salary,
          type: input.type,
          is_active: true,
          start_date: input.start_date,
        })
        if (error) throw error
        showSuccess('เพิ่มพนักงานสำเร็จ')
        await fetchEmployees()
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการเพิ่มพนักงาน')
        console.error(err)
      }
    },
    [effectiveBranchId, profile?.tenant_id, fetchEmployees],
  )

  const updateEmployee = useCallback(
    async (id: string, updates: Partial<CreateEmployeeInput>) => {
      try {
        const { error } = await supabase.from('employees').update(updates).eq('id', id)
        if (error) throw error
        showSuccess('แก้ไขข้อมูลพนักงานสำเร็จ')
        await fetchEmployees()
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการแก้ไข')
        console.error(err)
      }
    },
    [fetchEmployees],
  )

  const deactivateEmployee = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', id)
        if (error) throw error
        showSuccess('ปิดการใช้งานพนักงานสำเร็จ')
        await fetchEmployees()
      } catch (err) {
        showError('เกิดข้อผิดพลาด')
        console.error(err)
      }
    },
    [fetchEmployees],
  )

  return {
    employees,
    loading,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    refresh: fetchEmployees,
  }
}
