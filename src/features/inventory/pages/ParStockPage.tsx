import { useState, useMemo, useEffect, useCallback } from 'react'
import { ShoppingCart, Save, Settings } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useBranch } from '../../../hooks/useBranch'
import { useInventory } from '../hooks/useInventory'
import { supabase } from '../../../lib/supabase'
import { showSuccess, showError } from '../../../lib/toast'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { toBuddhistYear } from '../../../lib/date-utils'
import { THAI_MONTHS, INVENTORY_CATEGORIES, SAFETY_STOCK_PCT } from '../../../lib/constants'
// InventoryCategory type used implicitly via INVENTORY_CATEGORIES
import {
  estimatedMonthlyUsage,
  withSafetyStock,
  estimatedCost,
  dailyPar,
} from '../utils/parstock-calculations'

const CURRENT_CE_YEAR = new Date().getFullYear()

interface SalesTarget {
  date: string
  target_amount: number
}

export default function ParStockPage() {
  const { profile } = useAuth()
  const { activeBranch } = useBranch()
  const branchId = activeBranch?.id ?? null

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(CURRENT_CE_YEAR)
  const [safetyPct, setSafetyPct] = useState(SAFETY_STOCK_PCT * 100)
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)

  // Selected day for daily par
  const [selectedDay, setSelectedDay] = useState(1)

  const { items: inventoryRows, loading: invLoading } = useInventory({
    branchId,
    month,
    year,
  })

  const daysInMonth = new Date(year, month, 0).getDate()

  const fetchTargets = useCallback(async () => {
    if (!branchId) return
    setLoadingTargets(true)
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
      const { data } = await supabase
        .from('sales_targets')
        .select('date, target_amount')
        .eq('branch_id', branchId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')

      setSalesTargets(data ?? [])
    } finally {
      setLoadingTargets(false)
    }
  }, [branchId, month, year, daysInMonth])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  const monthlySalesTarget = useMemo(
    () => salesTargets.reduce((s, t) => s + t.target_amount, 0),
    [salesTargets],
  )

  const dailySalesTarget = useMemo(() => {
    const target = salesTargets.find((t) => {
      const d = new Date(t.date).getDate()
      return d === selectedDay
    })
    return target?.target_amount ?? 0
  }, [salesTargets, selectedDay])

  // Sales target input per day
  const [targetInputs, setTargetInputs] = useState<Record<number, string>>({})
  const [savingTargets, setSavingTargets] = useState(false)

  useEffect(() => {
    const inputs: Record<number, string> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const target = salesTargets.find(
        (t) => new Date(t.date).getDate() === d,
      )
      inputs[d] = target ? String(target.target_amount) : ''
    }
    setTargetInputs(inputs)
  }, [salesTargets, daysInMonth])

  async function saveTargets() {
    if (!branchId) return
    setSavingTargets(true)
    try {
      const rows = []
      for (let d = 1; d <= daysInMonth; d++) {
        const val = Number(targetInputs[d]) || 0
        if (val > 0) {
          rows.push({
            branch_id: branchId,
            date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            target_amount: val,
          })
        }
      }
      // Upsert all
      if (rows.length > 0) {
        const { error } = await supabase
          .from('sales_targets')
          .upsert(rows, { onConflict: 'branch_id,date' })
        if (error) throw error
      }
      showSuccess('บันทึกเป้าการขายสำเร็จ')
      fetchTargets()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSavingTargets(false)
    }
  }

  // Par stock computation
  const parStockRows = useMemo(() => {
    const safety = safetyPct / 100
    return inventoryRows.map((row) => {
      const estMonthly = estimatedMonthlyUsage(row.per10000, monthlySalesTarget)
      const withSafety = withSafetyStock(estMonthly, safety)
      const estCost = estimatedCost(withSafety, row.avgCostVal)
      const dPar = dailyPar(withSafety, monthlySalesTarget, dailySalesTarget)

      return {
        ...row,
        estMonthly,
        withSafety,
        estCost,
        dailyPar: dPar,
      }
    })
  }, [inventoryRows, safetyPct, monthlySalesTarget, dailySalesTarget])

  const loading = invLoading || loadingTargets
  const yearOptions = Array.from({ length: 5 }, (_, i) => CURRENT_CE_YEAR - 2 + i)

  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <ShoppingCart className="w-6 h-6" />
        Par Stock (ประมาณการสั่งซื้อ)
      </h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="select select-bordered select-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {THAI_MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="select select-bordered select-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {toBuddhistYear(y)}
            </option>
          ))}
        </select>
      </div>

      {/* Safety stock config */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-base-content/60" />
              <span className="text-sm font-medium">Safety Stock %</span>
            </div>
            <input
              type="number"
              className="input input-bordered input-sm w-24"
              value={safetyPct}
              onChange={(e) => setSafetyPct(Number(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.5}
            />
            <span className="text-sm text-base-content/60">%</span>

            <div className="divider divider-horizontal" />

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">เป้ารวมเดือน:</span>
              <span className="font-bold text-primary">
                {formatBaht(monthlySalesTarget)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">วัน Par:</span>
              <select
                className="select select-bordered select-xs w-20"
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ),
                )}
              </select>
              <span className="text-sm text-base-content/60">
                เป้า: {formatBaht(dailySalesTarget)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sales target per day (collapsible) */}
      <details className="collapse collapse-arrow bg-base-100 shadow mb-6">
        <summary className="collapse-title font-semibold text-sm">
          เป้าการขายรายวัน
        </summary>
        <div className="collapse-content">
          <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-2 mb-3">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <div key={d} className="form-control">
                <label className="label py-0">
                  <span className="label-text text-xs">วันที่ {d}</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-xs"
                  value={targetInputs[d] ?? ''}
                  onChange={(e) =>
                    setTargetInputs((prev) => ({
                      ...prev,
                      [d]: e.target.value,
                    }))
                  }
                  min={0}
                  step="any"
                />
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={saveTargets}
            disabled={savingTargets}
          >
            {savingTargets ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            บันทึกเป้าการขาย
          </button>
        </div>
      </details>

      {/* Par stock table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : parStockRows.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          ยังไม่มีข้อมูล Inventory สำหรับเดือนนี้
        </div>
      ) : (
        <div className="card bg-base-100 shadow">
          <div className="overflow-x-auto">
            <table className="table table-xs table-zebra w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-base-100 z-10">ชื่อ</th>
                  <th>หน่วย</th>
                  <th>หมวด</th>
                  <th className="text-right">ใช้ต่อ 10,000</th>
                  <th className="text-right">ประมาณการ/เดือน</th>
                  <th className="text-right">+Safety</th>
                  <th className="text-right">ต้นทุนประมาณ</th>
                  <th className="text-right">Par/วัน</th>
                </tr>
              </thead>
              <tbody>
                {parStockRows.map((r) => (
                  <tr key={r.id}>
                    <td className="sticky left-0 bg-base-100 z-10 font-medium whitespace-nowrap">
                      {r.name}
                    </td>
                    <td>{r.unit}</td>
                    <td className="text-xs">
                      {INVENTORY_CATEGORIES[r.category]}
                    </td>
                    <td className="text-right">
                      {formatNumber(r.per10000, 2)}
                    </td>
                    <td className="text-right">
                      {formatNumber(r.estMonthly, 2)}
                    </td>
                    <td className="text-right">
                      {formatNumber(r.withSafety, 2)}
                    </td>
                    <td className="text-right">{formatBaht(r.estCost)}</td>
                    <td className="text-right">
                      {formatNumber(r.dailyPar, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td
                    className="sticky left-0 bg-base-200 z-10"
                    colSpan={6}
                  >
                    รวมต้นทุนประมาณ
                  </td>
                  <td className="text-right">
                    {formatBaht(
                      parStockRows.reduce((s, r) => s + r.estCost, 0),
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
