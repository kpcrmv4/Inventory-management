import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { FullPLReport } from '../utils/pl-calculations'
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

/**
 * Server-side P&L summary shape returned by calculate_pl_summary RPC.
 */
interface PLSummaryRPC {
  revenue: {
    total_sales: number
    discount_0111: number
    discount_0112: number
    discount_0113: number
    total_discounts: number
    vat: number
    cash_over_short: number
    net_revenue: number
  }
  cogs: {
    cogs_0201_food: number
    cogs_0202_beverage: number
    cogs_0203_alcohol: number
    cogs_0204_dessert: number
    cogs_0205_packaging: number
    cogs_0206_ice: number
    cogs_0207_gas: number
    total_cogs: number
  }
  labor: {
    ft_pt_salary_0301: number
    ft_pt_ot_0302: number
    ft_pt_benefits_0303: number
    ft_pt_social_security_0304: number
    ft_pt_deductions_0305: number
    hq_salary_0306: number
    hq_ot_0307: number
    hq_benefits_0308: number
    hq_social_security_0309: number
    hq_deductions_0310: number
    transport_0311: number
    medical_0312: number
    bonus_0313: number
    total_labor: number
  }
  gross_profit: number
  controllable_expenses: number
  pac: number
  non_controllable_expenses: number
  gp_commission_0504: number
  ebitda: number
  depreciation_0601: number
  ebit: number
  interest_0701: number
  corporate_tax_0702: number
  net_profit: number
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
      // 1. Call server-side P&L calculation (handles all cross-module logic correctly)
      const { data: plData, error: plError } = await supabase.rpc('calculate_pl_summary', {
        p_branch_id: branchId,
        p_month: month,
        p_year: year,
      })

      if (plError) throw plError
      if (!plData) {
        setReport(null)
        return
      }

      const pl = plData as PLSummaryRPC

      // 2. Fetch individual monthly expenses for line-item display in controllable/non-controllable sections
      const { data: expensesData } = await supabase
        .from('monthly_expenses')
        .select('code, amount')
        .eq('branch_id', branchId)
        .eq('month', month)
        .eq('year', year)

      const expensesByCode: Record<string, number> = {}
      if (expensesData) {
        for (const row of expensesData) {
          expensesByCode[row.code] = (expensesByCode[row.code] ?? 0) + (row.amount ?? 0)
        }
      }

      // 3. Map RPC result to FullPLReport structure

      // Build controllable items (0401-0415) from expenses + 0409 from server (inventory)
      const controllableItems: Record<string, number> = {}
      const controllableCodes = [
        '0401', '0402', '0403', '0404', '0405',
        '0406', '0407', '0408', '0410',
        '0411', '0412', '0413', '0414', '0415',
      ]
      for (const code of controllableCodes) {
        controllableItems[code] = expensesByCode[code] ?? 0
      }
      // 0409 comes from inventory (server already computed the correct total including it)
      // We need to back-calculate 0409 from total: total_controllable - sum of other codes
      const otherControllableSum = controllableCodes.reduce((s, c) => s + (controllableItems[c] ?? 0), 0)
      controllableItems['0409'] = pl.controllable_expenses - otherControllableSum

      // Build non-controllable items (0501-0510) from expenses + 0504 from server (GP commission)
      const nonControllableItems: Record<string, number> = {}
      const nonControllableCodes = ['0501', '0502', '0503', '0505', '0506', '0507', '0508', '0509', '0510']
      for (const code of nonControllableCodes) {
        nonControllableItems[code] = expensesByCode[code] ?? 0
      }
      // 0504 GP commission comes from daily_sale_delivery_details (server computed)
      nonControllableItems['0504'] = pl.gp_commission_0504

      const fullReport: FullPLReport = {
        revenue: {
          grossRevenue: pl.revenue.total_sales,
          totalDiscount: -(pl.revenue.total_discounts),
          vat: -(Math.abs(pl.revenue.vat)),
          cashOverShort: pl.revenue.cash_over_short,
          netRevenue: pl.revenue.net_revenue,
        },
        cogs: {
          food: pl.cogs.cogs_0201_food,
          beverage: pl.cogs.cogs_0202_beverage,
          alcohol: pl.cogs.cogs_0203_alcohol,
          dessert: pl.cogs.cogs_0204_dessert,
          packaging: pl.cogs.cogs_0205_packaging,
          ice: pl.cogs.cogs_0206_ice,
          gas: pl.cogs.cogs_0207_gas,
          total: pl.cogs.total_cogs,
        },
        labor: {
          branchSalary: pl.labor.ft_pt_salary_0301,
          branchOT: pl.labor.ft_pt_ot_0302,
          branchWelfare: pl.labor.ft_pt_benefits_0303,
          branchSS: pl.labor.ft_pt_social_security_0304,
          branchDeductions: pl.labor.ft_pt_deductions_0305,
          hqSalary: pl.labor.hq_salary_0306,
          hqOT: pl.labor.hq_ot_0307,
          hqWelfare: pl.labor.hq_benefits_0308,
          hqSS: pl.labor.hq_social_security_0309,
          hqDeductions: pl.labor.hq_deductions_0310,
          travel: pl.labor.transport_0311,
          medical: pl.labor.medical_0312,
          bonus: pl.labor.bonus_0313,
          total: pl.labor.total_labor,
        },
        gp: pl.gross_profit,
        controllable: {
          items: controllableItems,
          total: pl.controllable_expenses,
        },
        pac: pl.pac,
        nonControllable: {
          items: nonControllableItems,
          total: pl.non_controllable_expenses,
        },
        ebitda: pl.ebitda,
        depreciation: pl.depreciation_0601,
        ebit: pl.ebit,
        interest: pl.interest_0701,
        tax: pl.corporate_tax_0702,
        netProfit: pl.net_profit,
      }

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
