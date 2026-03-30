import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { computeFullPL, type FullPLReport } from '../utils/pl-calculations'
import { showError } from '../../../lib/toast'

interface UsePLReportOptions {
  branchId: string | null
  month: number   // 1-12
  year: number    // CE year
}

interface UsePLReportReturn {
  report: FullPLReport | null
  loading: boolean
  refetch: () => void
}

export function usePLReport({ branchId, month, year }: UsePLReportOptions): UsePLReportReturn {
  const { profile } = useAuth()
  const [report, setReport] = useState<FullPLReport | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    if (!branchId || !profile?.tenant_id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Build date range for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`

      // Fetch daily sales for the month
      const { data: salesData } = await supabase
        .from('daily_sales')
        .select('channel_id, amount')
        .eq('branch_id', branchId)
        .gte('date', startDate)
        .lt('date', endDate)

      // Aggregate sales by channel code
      const dailySales: Record<string, number> = {}
      if (salesData) {
        for (const row of salesData) {
          const code = row.channel_id ?? 'unknown'
          dailySales[code] = (dailySales[code] ?? 0) + (row.amount ?? 0)
        }
      }

      // Fetch monthly expenses
      const { data: expensesData } = await supabase
        .from('monthly_expenses')
        .select('code, amount')
        .eq('branch_id', branchId)
        .gte('date', startDate)
        .lt('date', endDate)

      const monthlyExpenses: Record<string, number> = {}
      if (expensesData) {
        for (const row of expensesData) {
          monthlyExpenses[row.code] = (monthlyExpenses[row.code] ?? 0) + (row.amount ?? 0)
        }
      }

      // Fetch inventory usage amounts by category
      // This computes usage_amount = opening + received - closing per category
      const { data: openingData } = await supabase
        .from('opening_stock')
        .select('item_id, amount')
        .eq('branch_id', branchId)
        .eq('month', month)
        .eq('year', year) as { data: { item_id: string; amount: number }[] | null }

      const { data: closingData } = await supabase
        .from('closing_stock')
        .select('item_id, unit_price, quantity')
        .eq('branch_id', branchId)
        .eq('month', month)
        .eq('year', year) as { data: { item_id: string; unit_price: number; quantity: number }[] | null }

      const { data: receivingData } = await supabase
        .from('daily_receiving')
        .select('item_id, amount')
        .eq('branch_id', branchId)
        .gte('date', startDate)
        .lt('date', endDate) as { data: { item_id: string; amount: number }[] | null }

      const { data: itemsData } = await supabase
        .from('inventory_items')
        .select('id, category')
        .eq('branch_id', branchId)
        .eq('is_active', true) as { data: { id: string; category: string }[] | null }

      // Build item category map
      const itemCategory: Record<string, string> = {}
      if (itemsData) {
        for (const item of itemsData) {
          itemCategory[item.id] = item.category
        }
      }

      // Build opening amounts map
      const openingAmounts: Record<string, number> = {}
      if (openingData) {
        for (const row of openingData) {
          openingAmounts[row.item_id] = (openingAmounts[row.item_id] ?? 0) + (row.amount ?? 0)
        }
      }

      // Build received amounts map
      const receivedAmounts: Record<string, number> = {}
      if (receivingData) {
        for (const row of receivingData) {
          receivedAmounts[row.item_id] = (receivedAmounts[row.item_id] ?? 0) + (row.amount ?? 0)
        }
      }

      // Build closing amounts map
      const closingAmounts: Record<string, number> = {}
      if (closingData) {
        for (const row of closingData) {
          closingAmounts[row.item_id] = (row.unit_price ?? 0) * (row.quantity ?? 0)
        }
      }

      // Compute usage_amount per inventory category
      const inventoryUsage: Record<string, number> = {}
      if (itemsData) {
        for (const item of itemsData) {
          const opening = openingAmounts[item.id] ?? 0
          const received = receivedAmounts[item.id] ?? 0
          const closing = closingAmounts[item.id] ?? 0
          const usage = opening + received - closing
          const cat = item.category
          inventoryUsage[cat] = (inventoryUsage[cat] ?? 0) + usage
        }
      }

      // Fetch monthly labor data
      const { data: laborData } = await supabase
        .from('monthly_labor')
        .select('*')
        .eq('branch_id', branchId)
        .eq('month', month)
        .eq('year', year) as { data: any[] | null }

      // Aggregate labor totals
      const monthlyLabor: Record<string, number> = {}
      if (laborData) {
        let totalSalary = 0, totalOT = 0, totalWelfare = 0, totalSS = 0, totalDeductions = 0
        for (const row of laborData) {
          totalSalary += row.salary ?? 0
          totalOT += (row.ot_1x_amount ?? 0) + (row.ot_15x_amount ?? 0) + (row.ot_3x_amount ?? 0) + (row.ot_custom ?? 0)
          totalWelfare += (row.service_charge ?? 0) + (row.incentive ?? 0) + (row.food_allowance ?? 0) + (row.transport_allowance ?? 0) + (row.diligence ?? 0)
          totalSS += row.social_security ?? 0
          totalDeductions += row.total_deductions ?? 0
        }
        monthlyLabor['0301'] = totalSalary
        monthlyLabor['0302'] = totalOT
        monthlyLabor['0303'] = totalWelfare
        monthlyLabor['0304'] = totalSS
        monthlyLabor['0305'] = totalDeductions
      }

      // Extract discounts and special items from expenses/sales
      const discounts: Record<string, number> = {
        '0111': monthlyExpenses['0111'] ?? 0,
        '0112': monthlyExpenses['0112'] ?? 0,
        '0113': monthlyExpenses['0113'] ?? 0,
      }

      const fullReport = computeFullPL({
        dailySales,
        discounts,
        vat: monthlyExpenses['0114'] ?? 0,
        cashOverShort: monthlyExpenses['0115'] ?? 0,
        inventoryUsage,
        monthlyExpenses,
        monthlyLabor,
        depreciation: monthlyExpenses['0601'] ?? 0,
        interest: monthlyExpenses['0701'] ?? 0,
        tax: monthlyExpenses['0702'] ?? 0,
      })

      setReport(fullReport)
    } catch (err) {
      console.error('Failed to fetch P&L report:', err)
      showError('ไม่สามารถโหลดข้อมูลงบกำไร-ขาดทุนได้')
    } finally {
      setLoading(false)
    }
  }, [branchId, month, year, profile?.tenant_id])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return { report, loading, refetch: fetchReport }
}
