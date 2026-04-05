import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { showSuccess, showError } from '../../../lib/toast'
import { computeLaborRecord } from '../utils/labor-calculations'

export interface LaborRecord {
  id?: string
  employeeId: string
  salary: number
  ot1xHours: number
  ot1xAmount: number
  ot15xHours: number
  ot15xAmount: number
  ot3xHours: number
  ot3xAmount: number
  otCustom: number
  serviceCharge: number
  incentive: number
  foodAllowance: number
  transportAllowance: number
  diligence: number
  totalIncome: number
  sickLeaveDays: number
  sickLeaveAmount: number
  personalLeaveDays: number
  personalLeaveAmount: number
  absentDays: number
  absentAmount: number
  lateMinutes: number
  lateAmount: number
  loanDeduction: number
  taxDeduction: number
  socialSecurity: number
  totalDeductions: number
  netPay: number
}

function emptyRecord(employeeId: string, salary: number): LaborRecord {
  return {
    employeeId,
    salary,
    ot1xHours: 0, ot1xAmount: 0,
    ot15xHours: 0, ot15xAmount: 0,
    ot3xHours: 0, ot3xAmount: 0,
    otCustom: 0,
    serviceCharge: 0, incentive: 0,
    foodAllowance: 0, transportAllowance: 0, diligence: 0,
    totalIncome: salary,
    sickLeaveDays: 0, sickLeaveAmount: 0,
    personalLeaveDays: 0, personalLeaveAmount: 0,
    absentDays: 0, absentAmount: 0,
    lateMinutes: 0, lateAmount: 0,
    loanDeduction: 0, taxDeduction: 0, socialSecurity: 0,
    totalDeductions: 0,
    netPay: salary,
  }
}

export function useLabor(branchId: string | null, month: number, year: number) {
  const [records, setRecords] = useState<Map<string, LaborRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchLabor = useCallback(async () => {
    if (!branchId) {
      setLoading(false)
      return
    }
    setLoading(true)

    try {
      // monthly_labor has no branch_id — filter via employees relationship
      const { data, error } = await supabase
        .from('monthly_labor')
        .select('*, employees!inner(branch_id)')
        .eq('employees.branch_id', branchId)
        .eq('month', month)
        .eq('year', year)

      if (error) throw error

      const map = new Map<string, LaborRecord>()
      if (data) {
        for (const row of data) {
          map.set(row.employee_id, {
            id: row.id,
            employeeId: row.employee_id,
            salary: row.salary,
            ot1xHours: row.ot_1x_hours,
            ot1xAmount: row.ot_1x_amount,
            ot15xHours: row.ot_15x_hours,
            ot15xAmount: row.ot_15x_amount,
            ot3xHours: row.ot_3x_hours,
            ot3xAmount: row.ot_3x_amount,
            otCustom: row.ot_custom,
            serviceCharge: row.service_charge,
            incentive: row.incentive,
            foodAllowance: row.food_allowance,
            transportAllowance: row.transport_allowance,
            diligence: row.diligence_allowance,
            totalIncome: row.total_income,
            sickLeaveDays: row.sick_days,
            sickLeaveAmount: row.sick_amount,
            personalLeaveDays: row.personal_days,
            personalLeaveAmount: row.personal_amount,
            absentDays: row.absent_days,
            absentAmount: row.absent_amount,
            lateMinutes: row.late_minutes,
            lateAmount: row.late_amount,
            loanDeduction: row.loan_deduction,
            taxDeduction: row.tax_deduction,
            socialSecurity: row.social_security,
            totalDeductions: row.total_deductions,
            netPay: row.net_pay,
          })
        }
      }
      setRecords(map)
    } catch (err) {
      showError('ไม่สามารถโหลดข้อมูลเงินเดือนได้')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [branchId, month, year])

  useEffect(() => {
    fetchLabor()
  }, [fetchLabor])

  const getRecord = useCallback(
    (employeeId: string, salary: number): LaborRecord => {
      return records.get(employeeId) || emptyRecord(employeeId, salary)
    },
    [records],
  )

  const updateRecord = useCallback(
    (employeeId: string, updates: Partial<LaborRecord>) => {
      setRecords((prev) => {
        const map = new Map(prev)
        const existing = map.get(employeeId) || emptyRecord(employeeId, updates.salary || 0)
        const merged = { ...existing, ...updates }

        // Re-compute auto fields
        const computed = computeLaborRecord({
          salary: merged.salary,
          ot1xHours: merged.ot1xHours,
          ot15xHours: merged.ot15xHours,
          ot3xHours: merged.ot3xHours,
          otCustom: merged.otCustom,
          serviceCharge: merged.serviceCharge,
          incentive: merged.incentive,
          foodAllowance: merged.foodAllowance,
          transportAllowance: merged.transportAllowance,
          diligence: merged.diligence,
          sickLeaveDays: merged.sickLeaveDays,
          personalLeaveDays: merged.personalLeaveDays,
          absentDays: merged.absentDays,
          lateMinutes: merged.lateMinutes,
          loanDeduction: merged.loanDeduction,
          taxDeduction: merged.taxDeduction,
          socialSecurity: merged.socialSecurity,
        })

        map.set(employeeId, {
          ...merged,
          ot1xAmount: computed.ot1xAmount,
          ot15xAmount: computed.ot15xAmount,
          ot3xAmount: computed.ot3xAmount,
          sickLeaveAmount: computed.sickLeaveAmount,
          personalLeaveAmount: computed.personalLeaveAmount,
          absentAmount: computed.absentAmount,
          lateAmount: computed.lateAmount,
          totalIncome: computed.totalIncome,
          totalDeductions: computed.totalDeductions,
          netPay: computed.netPay,
        })
        return map
      })
    },
    [],
  )

  const saveAll = useCallback(async () => {
    if (!branchId) return
    setSaving(true)

    try {
      // Get employee IDs for this branch to scope the delete
      const employeeIds = Array.from(records.keys())

      if (employeeIds.length > 0) {
        // Delete existing records for these employees in this month
        await supabase
          .from('monthly_labor')
          .delete()
          .in('employee_id', employeeIds)
          .eq('month', month)
          .eq('year', year)
      }

      const rows = Array.from(records.values()).map((r) => ({
        employee_id: r.employeeId,
        month,
        year,
        salary: r.salary,
        ot_1x_hours: r.ot1xHours,
        ot_1x_amount: r.ot1xAmount,
        ot_15x_hours: r.ot15xHours,
        ot_15x_amount: r.ot15xAmount,
        ot_3x_hours: r.ot3xHours,
        ot_3x_amount: r.ot3xAmount,
        ot_custom: r.otCustom,
        service_charge: r.serviceCharge,
        incentive: r.incentive,
        food_allowance: r.foodAllowance,
        transport_allowance: r.transportAllowance,
        diligence_allowance: r.diligence,
        total_income: r.totalIncome,
        sick_days: r.sickLeaveDays,
        sick_amount: r.sickLeaveAmount,
        personal_days: r.personalLeaveDays,
        personal_amount: r.personalLeaveAmount,
        absent_days: r.absentDays,
        absent_amount: r.absentAmount,
        late_minutes: r.lateMinutes,
        late_amount: r.lateAmount,
        loan_deduction: r.loanDeduction,
        tax_deduction: r.taxDeduction,
        social_security: r.socialSecurity,
        bonus: 0,
        total_deductions: r.totalDeductions,
        net_pay: r.netPay,
      }))

      if (rows.length > 0) {
        const { error } = await supabase.from('monthly_labor').insert(rows)
        if (error) throw error
      }

      showSuccess('บันทึกข้อมูลเงินเดือนสำเร็จ')
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการบันทึก')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [branchId, month, year, records])

  return {
    records,
    loading,
    saving,
    getRecord,
    updateRecord,
    saveAll,
    refresh: fetchLabor,
  }
}
