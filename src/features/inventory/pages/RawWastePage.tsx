import { useEffect, useState, useCallback, useMemo } from 'react'
import { Trash, Plus, Trash2, Calendar } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { showSuccess, showError, showWarning } from '../../../lib/toast'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { formatThaiDate } from '../../../lib/date-utils'
import { useInventory } from '../hooks/useInventory'
import type { WasteType } from '../../../types/database'

interface InventoryOption {
  id: string
  name: string
  unit: string
}

interface WasteEntry {
  id: string
  item_id: string
  itemName: string
  itemUnit: string
  qty: number
  type: WasteType
  date: string
}

const WASTE_TYPE_LABEL: Record<WasteType, string> = {
  trimmed: 'ตัดแต่งแล้ว',
  untrimmed: 'ยังไม่ตัดแต่ง',
}

const CURRENT_CE_YEAR = new Date().getFullYear()

export default function RawWastePage() {
  const { profile } = useAuth()
  const branchId = profile?.branch_id ?? null

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(CURRENT_CE_YEAR)

  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([])
  const [entries, setEntries] = useState<WasteEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [selectedItem, setSelectedItem] = useState('')
  const [qty, setQty] = useState('')
  const [wasteType, setWasteType] = useState<WasteType>('trimmed')
  const [submitting, setSubmitting] = useState(false)

  // Inventory data for avg cost computation
  const { items: inventoryRows } = useInventory({ branchId, month, year })

  const fetchItems = useCallback(async () => {
    if (!branchId) return
    const { data } = await supabase
      .from('inventory_items')
      .select('id, name, unit')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('name')
    setInventoryOptions(data ?? [])
  }, [branchId])

  const fetchEntries = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('raw_waste')
        .select('id, item_id, qty, type, date')
        .eq('branch_id', branchId)
        .eq('date', date)
        .order('created_at', { ascending: false })

      const mapped: WasteEntry[] = (data ?? []).map((d) => {
        const item = inventoryOptions.find((i) => i.id === d.item_id)
        return {
          id: d.id,
          item_id: d.item_id,
          itemName: item?.name ?? '-',
          itemUnit: item?.unit ?? '',
          qty: d.qty,
          type: d.type as WasteType,
          date: d.date,
        }
      })
      setEntries(mapped)
    } finally {
      setLoading(false)
    }
  }, [branchId, date, inventoryOptions])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    if (inventoryOptions.length > 0) fetchEntries()
  }, [fetchEntries, inventoryOptions])

  // When date changes, update month/year for inventory hook
  useEffect(() => {
    const d = new Date(date)
    setMonth(d.getMonth() + 1)
    setYear(d.getFullYear())
  }, [date])

  async function handleAdd() {
    if (!branchId) return
    if (!selectedItem) {
      showWarning('กรุณาเลือกรายการ')
      return
    }
    const qtyVal = Number(qty) || 0
    if (qtyVal <= 0) {
      showWarning('กรุณากรอกจำนวน')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('raw_waste').insert({
        branch_id: branchId,
        item_id: selectedItem,
        date,
        qty: qtyVal,
        type: wasteType,
      })
      if (error) throw error
      showSuccess('บันทึกของเสียสำเร็จ')
      setSelectedItem('')
      setQty('')
      fetchEntries()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('raw_waste').delete().eq('id', id)
      if (error) throw error
      showSuccess('ลบรายการสำเร็จ')
      fetchEntries()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  // Waste summary per item (with avg cost from inventory)
  const wasteSummary = useMemo(() => {
    const map = new Map<
      string,
      { itemName: string; totalQty: number; avgCost: number }
    >()
    for (const entry of entries) {
      const cur = map.get(entry.item_id) ?? {
        itemName: entry.itemName,
        totalQty: 0,
        avgCost: 0,
      }
      cur.totalQty += entry.qty

      // Find avg cost from inventory
      const invRow = inventoryRows.find((r) => r.id === entry.item_id)
      if (invRow) {
        cur.avgCost = invRow.avgCostVal
      }

      map.set(entry.item_id, cur)
    }
    return Array.from(map.entries()).map(([itemId, val]) => ({
      itemId,
      ...val,
      totalAmount: val.totalQty * val.avgCost,
    }))
  }, [entries, inventoryRows])

  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Trash className="w-6 h-6" />
        บันทึกของเสีย (Raw Waste)
      </h1>

      {/* Date picker */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-base-content/60" />
        <input
          type="date"
          className="input input-bordered input-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <span className="text-sm text-base-content/60">
          {formatThaiDate(date)}
        </span>
      </div>

      {/* Add form */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body p-4">
          <h3 className="font-semibold mb-3">เพิ่มรายการของเสีย</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="form-control flex-1">
              <label className="label py-0">
                <span className="label-text text-xs">รายการ</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="">-- เลือกรายการ --</option>
                {inventoryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control w-full sm:w-32">
              <label className="label py-0">
                <span className="label-text text-xs">จำนวน</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                min={0}
                step="any"
              />
            </div>
            <div className="form-control w-full sm:w-48">
              <label className="label py-0">
                <span className="label-text text-xs">ประเภท</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value as WasteType)}
              >
                <option value="trimmed">ตัดแต่งแล้ว</option>
                <option value="untrimmed">ยังไม่ตัดแต่ง</option>
              </select>
            </div>
            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={handleAdd}
              disabled={submitting}
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              เพิ่ม
            </button>
          </div>
        </div>
      </div>

      {/* Entries table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          ยังไม่มีรายการของเสียสำหรับวันที่เลือก
        </div>
      ) : (
        <>
          <div className="card bg-base-100 shadow mb-6">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>รายการ</th>
                    <th>หน่วย</th>
                    <th className="text-right">จำนวน</th>
                    <th>ประเภท</th>
                    <th className="text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-medium">{entry.itemName}</td>
                      <td>{entry.itemUnit}</td>
                      <td className="text-right">
                        {formatNumber(entry.qty, 2)}
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            entry.type === 'trimmed'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          {WASTE_TYPE_LABEL[entry.type]}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Waste summary */}
          {wasteSummary.length > 0 && (
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <h3 className="font-semibold mb-3">
                  สรุปของเสียรายรายการ (วันที่เลือก)
                </h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>รายการ</th>
                        <th className="text-right">จำนวนรวม</th>
                        <th className="text-right">ต้นทุนเฉลี่ย</th>
                        <th className="text-right">มูลค่าของเสีย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wasteSummary.map((ws) => (
                        <tr key={ws.itemId}>
                          <td className="font-medium">{ws.itemName}</td>
                          <td className="text-right">
                            {formatNumber(ws.totalQty, 2)}
                          </td>
                          <td className="text-right">
                            {formatBaht(ws.avgCost)}
                          </td>
                          <td className="text-right">
                            {formatBaht(ws.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td colSpan={3} className="text-right">
                          รวมมูลค่าของเสีย
                        </td>
                        <td className="text-right">
                          {formatBaht(
                            wasteSummary.reduce(
                              (s, ws) => s + ws.totalAmount,
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
