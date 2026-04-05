import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown,
  Package, Receipt, Users, FileText, MessageSquare,
  ArrowRight,
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
    { to: '/app/inventory/main-table', icon: <Package size={20} />, label: 'คลังวัตถุดิบ', gradient: 'bg-gradient-card-blue' },
    { to: '/app/inventory/receiving', icon: <Package size={20} />, label: 'รับของเข้า', gradient: 'bg-gradient-card-green' },
    { to: '/app/pl/daily-sale', icon: <Receipt size={20} />, label: 'ยอดขายรายวัน', gradient: 'bg-gradient-card-orange' },
    { to: '/app/pl/report', icon: <FileText size={20} />, label: 'งบ P&L', gradient: 'bg-gradient-card-purple', roles: ['owner'] },
    { to: '/app/pl/expenses', icon: <Receipt size={20} />, label: 'ค่าใช้จ่าย', gradient: 'bg-gradient-card-blue' },
    { to: '/app/complaints', icon: <MessageSquare size={20} />, label: 'ข้อร้องเรียน', gradient: 'bg-gradient-card-orange' },
  ]

  const filteredLinks = quickLinks.filter(
    link => !link.roles || (profile?.role && link.roles.includes(profile.role))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
          <LayoutDashboard size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-base-content/50">
            {activeBranch?.name} | {formatMonthYear(currentMonth, currentYear)}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      {!loading && kpi && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-base-100 card-enhanced bg-gradient-card-green">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/60">ยอดขายวันนี้</span>
                  <div className="icon-box-sm bg-success/10 text-success rounded-lg">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-1">{formatBaht(kpi.todaySales)}</p>
              </div>
            </div>

            <div className="card bg-base-100 card-enhanced bg-gradient-card-blue">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/60">ยอดขายเดือนนี้</span>
                  <div className="icon-box-sm bg-info/10 text-info rounded-lg">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-1">{formatBaht(kpi.monthSales)}</p>
              </div>
            </div>

            <div className="card bg-base-100 card-enhanced bg-gradient-card-orange">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/60">COGS %</span>
                  <div className="icon-box-sm bg-warning/10 text-warning rounded-lg">
                    <TrendingDown size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-1">{formatPercent(kpi.cogsPercent)}</p>
                <p className="text-xs text-base-content/40 mt-0.5">GP {formatPercent(kpi.gpPercent)}</p>
              </div>
            </div>

            <div className="card bg-base-100 card-enhanced bg-gradient-card-purple">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/60">จำนวนพนักงาน</span>
                  <div className="icon-box-sm bg-primary/10 text-primary rounded-lg">
                    <Users size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-1">{formatNumber(kpi.employeeCount, 0)} คน</p>
              </div>
            </div>
          </div>

          {/* Monthly Summary Card */}
          <div className="card bg-base-100 card-enhanced">
            <div className="card-body">
              <h2 className="card-title text-lg">สรุปยอดขายเดือนนี้</h2>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td className="text-base-content/60">รายได้รวม</td>
                      <td className="text-right font-mono">{formatBaht(kpi.monthRevenue)}</td>
                    </tr>
                    <tr>
                      <td className="text-base-content/60">ต้นทุนขาย (COGS)</td>
                      <td className="text-right font-mono text-error">{formatBaht(kpi.monthCOGS)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td>Gross Profit (โดยประมาณ)</td>
                      <td className="text-right font-mono text-success">
                        {formatBaht(kpi.monthRevenue - kpi.monthCOGS)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {profile?.role === 'owner' && (
                <div className="card-actions justify-end mt-2">
                  <Link to="/app/pl/report" className="btn btn-primary btn-sm gap-1">
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
        <h2 className="text-lg font-semibold mb-3">ทางลัด</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {filteredLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`card bg-base-100 card-enhanced hover:scale-[1.02] ${link.gradient}`}
            >
              <div className="card-body items-center text-center p-4">
                <div className="text-primary">{link.icon}</div>
                <span className="text-sm font-medium mt-1">{link.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
