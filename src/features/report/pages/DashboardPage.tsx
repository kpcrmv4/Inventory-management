import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown,
  Package, Receipt, Users, FileText, MessageSquare,
  ArrowRight, Wallet, BookOpen,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { useBranch } from '../../../hooks/useBranch'
import { formatBaht, formatPercent, formatNumber, safeDivide } from '../../../lib/currency'
import { formatMonthYear } from '../../../lib/date-utils'

interface KPIData {
  todaySales: number
  monthSales: number
  monthCOGS: number
  monthRevenue: number
  cogsPercent: number
  gpPercent: number
  employeeCount: number
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { activeBranch } = useBranch()
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const todayStr = now.toISOString().slice(0, 10)

  useEffect(() => {
    async function fetchDashboard() {
      if (!activeBranch?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
        const endDate = currentMonth === 12
          ? `${currentYear + 1}-01-01`
          : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`

        const { data: todaySalesData } = await supabase
          .from('daily_sales')
          .select('amount')
          .eq('branch_id', activeBranch.id)
          .eq('date', todayStr)

        const todaySales = (todaySalesData as any[] ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)

        const { data: monthSalesData } = await supabase
          .from('daily_sales')
          .select('amount')
          .eq('branch_id', activeBranch.id)
          .gte('date', startDate)
          .lt('date', endDate)

        const monthSales = (monthSalesData as any[] ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)

        const { data: expData } = await supabase
          .from('monthly_expenses')
          .select('code, amount')
          .eq('branch_id', activeBranch.id)
          .gte('date', startDate)
          .lt('date', endDate)
          .in('code', ['0206', '0207'])

        const expCOGS = (expData as any[] ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)

        const { count: employeeCount } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranch.id)
          .eq('is_active', true)

        const monthCOGS = expCOGS
        const cogsPercent = safeDivide(monthCOGS, monthSales) * 100
        const gpPercent = 100 - cogsPercent

        setKpi({
          todaySales,
          monthSales,
          monthCOGS,
          monthRevenue: monthSales,
          cogsPercent,
          gpPercent,
          employeeCount: employeeCount ?? 0,
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [activeBranch?.id, currentMonth, currentYear, todayStr])

  const quickLinks = [
    { to: '/app/inventory/main-table', icon: <Package size={22} />, label: 'คลังวัตถุดิบ', bgClass: 'bg-blue-100 text-blue-600', darkBg: 'dark:bg-blue-900/30 dark:text-blue-400' },
    { to: '/app/inventory/receiving', icon: <Package size={22} />, label: 'รับของเข้า', bgClass: 'bg-emerald-100 text-emerald-600', darkBg: 'dark:bg-emerald-900/30 dark:text-emerald-400' },
    { to: '/app/pl/daily-sale', icon: <Receipt size={22} />, label: 'ยอดขาย', bgClass: 'bg-amber-100 text-amber-600', darkBg: 'dark:bg-amber-900/30 dark:text-amber-400' },
    { to: '/app/pl/report', icon: <FileText size={22} />, label: 'งบ P&L', bgClass: 'bg-purple-100 text-purple-600', darkBg: 'dark:bg-purple-900/30 dark:text-purple-400', roles: ['owner'] },
    { to: '/app/pl/expenses', icon: <Wallet size={22} />, label: 'ค่าใช้จ่าย', bgClass: 'bg-pink-100 text-pink-600', darkBg: 'dark:bg-pink-900/30 dark:text-pink-400' },
    { to: '/app/recipes', icon: <BookOpen size={22} />, label: 'สูตรอาหาร', bgClass: 'bg-orange-100 text-orange-600', darkBg: 'dark:bg-orange-900/30 dark:text-orange-400' },
  ]

  const filteredLinks = quickLinks.filter(
    link => !link.roles || (profile?.role && link.roles.includes(profile.role))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
        <p className="text-sm text-base-content/50 mt-1">
          {activeBranch?.name} | {formatMonthYear(currentMonth, currentYear)}
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      {!loading && kpi && (
        <>
          {/* KPI Cards - pastel colored like reference apps */}
          <div className="grid grid-cols-2 gap-3">
            {/* Today Sales */}
            <div className="card kpi-card-green p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-base-content/60 font-medium">ยอดขายวันนี้</span>
                <div className="icon-circle-sm bg-emerald-200/60">
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-extrabold tracking-tight">{formatBaht(kpi.todaySales)}</p>
            </div>

            {/* Month Sales */}
            <div className="card kpi-card-blue p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-base-content/60 font-medium">ยอดขายเดือนนี้</span>
                <div className="icon-circle-sm bg-blue-200/60">
                  <TrendingUp size={16} className="text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-extrabold tracking-tight">{formatBaht(kpi.monthSales)}</p>
            </div>

            {/* COGS % */}
            <div className="card kpi-card-orange p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-base-content/60 font-medium">COGS %</span>
                <div className="icon-circle-sm bg-amber-200/60">
                  <TrendingDown size={16} className="text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-extrabold tracking-tight">{formatPercent(kpi.cogsPercent)}</p>
              <p className="text-xs text-base-content/40 mt-1">GP {formatPercent(kpi.gpPercent)}</p>
            </div>

            {/* Employee Count */}
            <div className="card kpi-card-purple p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-base-content/60 font-medium">พนักงาน</span>
                <div className="icon-circle-sm bg-purple-200/60">
                  <Users size={16} className="text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-extrabold tracking-tight">{formatNumber(kpi.employeeCount, 0)} <span className="text-sm font-medium text-base-content/50">คน</span></p>
            </div>
          </div>

          {/* Monthly Summary Card */}
          <div className="card bg-base-100 card-enhanced">
            <div className="card-body p-5">
              <h2 className="font-bold text-base mb-3">สรุปยอดขายเดือนนี้</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/60">รายได้รวม</span>
                  <span className="font-mono font-semibold">{formatBaht(kpi.monthRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/60">ต้นทุนขาย (COGS)</span>
                  <span className="font-mono font-semibold text-error">{formatBaht(kpi.monthCOGS)}</span>
                </div>
                <div className="section-divider" />
                <div className="flex justify-between items-center">
                  <span className="font-bold">Gross Profit (ประมาณ)</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatBaht(kpi.monthRevenue - kpi.monthCOGS)}
                  </span>
                </div>
              </div>
              {profile?.role === 'owner' && (
                <div className="mt-4">
                  <Link to="/app/pl/report" className="btn btn-primary btn-sm w-full gap-1">
                    ดูงบ P&L ฉบับเต็ม <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="font-bold text-base mb-3">ทางลัด</h2>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {filteredLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="card bg-base-100 card-enhanced hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="card-body items-center text-center p-4 gap-2">
                <div className={`icon-circle ${link.bgClass} ${link.darkBg}`}>
                  {link.icon}
                </div>
                <span className="text-xs font-semibold">{link.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
