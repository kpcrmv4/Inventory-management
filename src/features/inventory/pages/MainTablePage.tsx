import { useState, useEffect, useMemo } from 'react'
import {
  Package,
  Plus,
  X,
  Save,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useBranch } from '../../../hooks/useBranch'
import { useInventory } from '../hooks/useInventory'
import type { InventoryRow } from '../hooks/useInventory'
import { supabase } from '../../../lib/supabase'
import { showSuccess, showError, showWarning } from '../../../lib/toast'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { toBuddhistYear } from '../../../lib/date-utils'
import { INVENTORY_CATEGORIES, THAI_MONTHS } from '../../../lib/constants'
import type { InventoryCategory } from '../../../types/database'

const CURRENT_CE_YEAR = new Date().getFullYear()
const CATEGORY_KEYS = Object.keys(INVENTORY_CATEGORIES) as InventoryCategory[]

export default function MainTablePage() {
  const { profile } = useAuth()
  const { activeBranch } = useBranch()
  const branchId = activeBranch?.id ?? null

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(CURRENT_CE_YEAR)

  const { items, header, loading, refetch } = useInventory({
    branchId,
    month,
    year,
  })

  // Monthly header form
  const [totalSales, setTotalSales] = useState<string>('')
  const [sellingDays, setSellingDays] = useState<string>('')
  const [savingHeader, setSavingHeader] = useState(false)

  // Sync header values when data loads
  useEffect(() => {
    if (header.totalMonthlySales) setTotalSales(String(header.totalMonthlySales))
    if (header.sellingDays) setSellingDays(String(header.sellingDays))
  }, [header.totalMonthlySales, header.sellingDays])

  // Add item modal
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newCategory, setNewCategory] = useState<InventoryCategory>('0201_dry')
  const [addingItem, setAddingItem] = useState(false)

  // Collapsible categories
  const [expandedCats, setExpandedCats] = useState<Set<InventoryCategory>>(
    new Set(CATEGORY_KEYS),
  )

  const grouped = useMemo(() => {
    const map = new Map<InventoryCategory, InventoryRow[]>()
    for (const cat of CATEGORY_KEYS) {
      map.set(cat, [])
    }
    for (const item of items) {
      const list = map.get(item.category)
      if (list) list.push(item)
    }
    return map
  }, [items])

  function toggleCategory(cat: InventoryCategory) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  async function saveHeader() {
    if (!branchId) return
    const sales = Number(totalSales) || 0
    const days = Number(sellingDays) || 0
    if (days < 0 || days > 31) {
      showWarning('จำนวนวันขายต้องอยู่ระหว่าง 0-31')
      return
    }
    setSavingHeader(true)
    try {
      const { error } = await supabase.from('monthly_inventory_header').upsert(
        {
          branch_id: branchId,
          month,
          year,
          total_monthly_sales: sales,
          selling_days: days,
        },
        { onConflict: 'branch_id,month,year' },
      )
      if (error) throw error
      showSuccess('บันทึกข้อมูลส่วนหัวสำเร็จ')
      refetch()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSavingHeader(false)
    }
  }

  async function addItem() {
    if (!branchId || !profile?.tenant_id) return
    if (!newName.trim() || !newUnit.trim()) {
      showWarning('กรุณากรอกชื่อและหน่วย')
      return
    }
    setAddingItem(true)
    try {
      const { error } = await supabase.from('inventory_items').insert({
        tenant_id: profile.tenant_id,
        branch_id: branchId,
        name: newName.trim(),
        unit: newUnit.trim(),
        category: newCategory,
        is_active: true,
      })
      if (error) throw error
      showSuccess('เพิ่มรายการสำเร็จ')
      setShowModal(false)
      setNewName('')
      setNewUnit('')
      refetch()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setAddingItem(false)
    }
  }

  // Year options: current year +/- 2
  const yearOptions = Array.from({ length: 5 }, (_, i) => CURRENT_CE_YEAR - 2 + i)

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ข้อมูลหลัก Inventory</h1>
            <p className="text-sm text-base-content/50">จัดการข้อมูลวัตถุดิบทั้งหมด</p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm gap-1 shadow-md shadow-primary/20"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">เพิ่มรายการ</span>
        </button>
      </div>

      {/* Month/year selector */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="select select-bordered select-sm flex-1 min-w-[120px] max-w-[160px]"
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
              className="select select-bordered select-sm w-24"
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
        </div>
      </div>

      {/* Monthly header */}
      <div className="form-section">
        <div className="p-0">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <div className="icon-circle-sm bg-primary/10">
              <Save size={14} className="text-primary" />
            </div>
            ข้อมูลรายเดือน
          </h3>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text text-xs font-medium">ยอดขายรวมเดือน (บาท)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={totalSales}
                onChange={(e) => setTotalSales(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="form-control flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs font-medium">จำนวนวันขาย</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full"
                  value={sellingDays}
                  onChange={(e) => setSellingDays(e.target.value)}
                  min={0}
                  max={31}
                  placeholder="0"
                />
              </div>
              <button
                className="btn btn-primary btn-sm gap-1 shadow-md shadow-primary/20"
                onClick={saveHeader}
                disabled={savingHeader}
              >
                {savingHeader ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="empty-state-icon animate-subtle-pulse">
            <Package size={32} className="text-base-content/30" />
          </div>
          <p className="text-base-content/40 font-medium">ยังไม่มีรายการ</p>
          <p className="text-base-content/30 text-sm mt-1">กดปุ่ม "เพิ่มรายการ" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_KEYS.map((cat) => {
            const rows = grouped.get(cat) ?? []
            if (rows.length === 0) return null
            const expanded = expandedCats.has(cat)

            return (
              <div key={cat} className="card bg-base-100 card-enhanced">
                <button
                  className="flex items-center gap-2 p-4 w-full text-left font-semibold hover:bg-base-200 transition"
                  onClick={() => toggleCategory(cat)}
                >
                  {expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  {INVENTORY_CATEGORIES[cat]} ({rows.length})
                </button>

                {expanded && (
                  <div className="overflow-x-auto px-4 pb-4">
                    <table className="table table-xs table-zebra w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-base-100 z-10">ชื่อ</th>
                          <th>หน่วย</th>
                          <th className="text-right">ตั้งต้น(จน.)</th>
                          <th className="text-right">ตั้งต้น(บาท)</th>
                          <th className="text-right">รับเข้า(จน.)</th>
                          <th className="text-right">รับเข้า(บาท)</th>
                          <th className="text-right">ราคา/หน่วย</th>
                          <th className="text-right">คงเหลือ(จน.)</th>
                          <th className="text-right">คงเหลือ(บาท)</th>
                          <th className="text-right">ใช้ไป(จน.)</th>
                          <th className="text-right">ใช้ไป(บาท)</th>
                          <th className="text-right">เฉลี่ย/วัน</th>
                          <th className="text-right">ต้นทุนเฉลี่ย</th>
                          <th className="text-right">ต่อ 10,000</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id}>
                            <td className="sticky left-0 bg-base-100 z-10 font-medium whitespace-nowrap">
                              {r.name}
                            </td>
                            <td>{r.unit}</td>
                            <td className="text-right">
                              {formatNumber(r.openingQty, 2)}
                            </td>
                            <td className="text-right">
                              {formatBaht(r.openingAmount)}
                            </td>
                            <td className="text-right">
                              {formatNumber(r.totalReceivedQty, 2)}
                            </td>
                            <td className="text-right">
                              {formatBaht(r.totalReceivedAmount)}
                            </td>
                            <td className="text-right">
                              {formatBaht(r.closingUnitPrice)}
                            </td>
                            <td className="text-right">
                              {formatNumber(r.closingQty, 2)}
                            </td>
                            <td className="text-right">
                              {formatBaht(r.closingAmount)}
                            </td>
                            <td className="text-right">
                              {formatNumber(r.uQty, 2)}
                            </td>
                            <td className="text-right">
                              {formatBaht(r.uAmount)}
                            </td>
                            <td className="text-right">
                              {formatNumber(r.avgDaily, 2)}
                            </td>
                            <td className="text-right">
                              {formatBaht(r.avgCostVal)}
                            </td>
                            <td className="text-right">
                              {formatNumber(r.per10000, 2)}
                            </td>
                          </tr>
                        ))}
                        {/* Category subtotal */}
                        <tr className="font-bold bg-base-200">
                          <td className="sticky left-0 bg-base-200 z-10">
                            รวม
                          </td>
                          <td />
                          <td className="text-right">
                            {formatNumber(
                              rows.reduce((s, r) => s + r.openingQty, 0),
                              2,
                            )}
                          </td>
                          <td className="text-right">
                            {formatBaht(
                              rows.reduce((s, r) => s + r.openingAmount, 0),
                            )}
                          </td>
                          <td className="text-right">
                            {formatNumber(
                              rows.reduce((s, r) => s + r.totalReceivedQty, 0),
                              2,
                            )}
                          </td>
                          <td className="text-right">
                            {formatBaht(
                              rows.reduce(
                                (s, r) => s + r.totalReceivedAmount,
                                0,
                              ),
                            )}
                          </td>
                          <td />
                          <td className="text-right">
                            {formatNumber(
                              rows.reduce((s, r) => s + r.closingQty, 0),
                              2,
                            )}
                          </td>
                          <td className="text-right">
                            {formatBaht(
                              rows.reduce((s, r) => s + r.closingAmount, 0),
                            )}
                          </td>
                          <td className="text-right">
                            {formatNumber(
                              rows.reduce((s, r) => s + r.uQty, 0),
                              2,
                            )}
                          </td>
                          <td className="text-right">
                            {formatBaht(
                              rows.reduce((s, r) => s + r.uAmount, 0),
                            )}
                          </td>
                          <td />
                          <td />
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add item modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowModal(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg mb-4">เพิ่มรายการใหม่</h3>

            <div className="space-y-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">ชื่อรายการ</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น ซอสถั่วเหลือง"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">หน่วย</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="เช่น ขวด, กก., ถุง"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">หมวดหมู่</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as InventoryCategory)
                  }
                >
                  {CATEGORY_KEYS.map((cat) => (
                    <option key={cat} value={cat}>
                      {INVENTORY_CATEGORIES[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                ยกเลิก
              </button>
              <button
                className="btn btn-primary gap-1"
                onClick={addItem}
                disabled={addingItem}
              >
                {addingItem ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                เพิ่ม
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
        </div>
      )}
    </div>
  )
}
