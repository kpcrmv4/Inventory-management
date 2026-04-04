import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'

interface ExpenseRecord {
  id?: string
  code: string
  amount: number
  units: number | null
  date: string | null
  label: string | null
}

interface DepreciationRecord {
  totalDepreciation: number
  leaseMonths: number
}

export function useExpenses(branchId: string | null, month: number, year: number) {
  const { profile } = useAuth()
  const [fixedExpenses, setFixedExpenses] = useState<ExpenseRecord[]>([])
  const [variableExpenses, setVariableExpenses] = useState<ExpenseRecord[]>([])
  const [depreciation, setDepreciation] = useState<DepreciationRecord>({
    totalDepreciation: 0,
    leaseMonths: 1,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const effectiveBranchId = branchId

  const fetchExpenses = useCallback(async () => {
    if (!effectiveBranchId) return
    setLoading(true)

    try {
      const { data } = await supabase
        .from('monthly_expenses')
        .select('*')
        .eq('branch_id', effectiveBranchId)
        .eq('month', month)
        .eq('year', year)

      if (data) {
        const fixed = data.filter((d) => !d.date)
        const variable = data.filter((d) => !!d.date)
        setFixedExpenses(
          fixed.map((f) => ({
            id: f.id,
            code: f.code,
            amount: f.amount,
            units: f.units,
            date: f.date,
            label: f.label,
          })),
        )
        setVariableExpenses(
          variable.map((v) => ({
            id: v.id,
            code: v.code,
            amount: v.amount,
            units: v.units,
            date: v.date,
            label: v.label,
          })),
        )
      }

      // Depreciation settings
      const { data: depData } = await supabase
        .from('depreciation_settings')
        .select('*')
        .eq('branch_id', effectiveBranchId)
        .single()

      if (depData) {
        setDepreciation({
          totalDepreciation: depData.total_depreciation,
          leaseMonths: depData.lease_months,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [effectiveBranchId, month, year])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const saveFixedExpenses = useCallback(
    async (expenses: ExpenseRecord[]) => {
      if (!effectiveBranchId) return
      setSaving(true)

      try {
        // Delete existing fixed expenses for this month
        await supabase
          .from('monthly_expenses')
          .delete()
          .eq('branch_id', effectiveBranchId)
          .eq('month', month)
          .eq('year', year)
          .is('date', null)

        const rows = expenses
          .filter((e) => e.amount !== 0)
          .map((e) => ({
            branch_id: effectiveBranchId,
            code: e.code,
            amount: e.amount,
            units: e.units,
            date: null as string | null,
            month,
            year,
            label: e.label,
          }))

        if (rows.length > 0) {
          const { error } = await supabase.from('monthly_expenses').insert(rows)
          if (error) throw error
        }

        showSuccess('บันทึกค่าใช้จ่ายคงที่สำเร็จ')
        setFixedExpenses(expenses)
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการบันทึก')
        console.error(err)
      } finally {
        setSaving(false)
      }
    },
    [effectiveBranchId, month, year],
  )

  const saveVariableExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!effectiveBranchId) return
      setSaving(true)

      try {
        if (expense.id) {
          const { error } = await supabase
            .from('monthly_expenses')
            .update({
              amount: expense.amount,
              units: expense.units,
            })
            .eq('id', expense.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('monthly_expenses').insert({
            branch_id: effectiveBranchId,
            code: expense.code,
            amount: expense.amount,
            units: expense.units,
            date: expense.date,
            month,
            year,
            label: expense.label,
          })
          if (error) throw error
        }

        showSuccess('บันทึกสำเร็จ')
        await fetchExpenses()
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการบันทึก')
        console.error(err)
      } finally {
        setSaving(false)
      }
    },
    [effectiveBranchId, month, year, fetchExpenses],
  )

  const deleteVariableExpense = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('monthly_expenses').delete().eq('id', id)
        if (error) throw error
        showSuccess('ลบสำเร็จ')
        await fetchExpenses()
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการลบ')
        console.error(err)
      }
    },
    [fetchExpenses],
  )

  const saveDepreciation = useCallback(
    async (settings: DepreciationRecord) => {
      if (!effectiveBranchId) return
      setSaving(true)

      try {
        const { data: existing } = await supabase
          .from('depreciation_settings')
          .select('id')
          .eq('branch_id', effectiveBranchId)
          .single()

        if (existing) {
          const { error } = await supabase
            .from('depreciation_settings')
            .update({
              total_depreciation: settings.totalDepreciation,
              lease_months: settings.leaseMonths,
            })
            .eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('depreciation_settings').insert({
            branch_id: effectiveBranchId,
            total_depreciation: settings.totalDepreciation,
            lease_months: settings.leaseMonths,
          })
          if (error) throw error
        }

        showSuccess('บันทึกค่าเสื่อมสำเร็จ')
        setDepreciation(settings)
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการบันทึก')
        console.error(err)
      } finally {
        setSaving(false)
      }
    },
    [effectiveBranchId],
  )

  return {
    fixedExpenses,
    setFixedExpenses,
    variableExpenses,
    setVariableExpenses,
    depreciation,
    setDepreciation,
    loading,
    saving,
    saveFixedExpenses,
    saveVariableExpense,
    deleteVariableExpense,
    saveDepreciation,
  }
}
