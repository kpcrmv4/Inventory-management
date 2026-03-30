import { useEffect, useState, useCallback } from 'react'
import {
  PackagePlus,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Calendar,
} from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { showSuccess, showError, showWarning } from '../../../lib/toast'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { formatThaiDate } from '../../../lib/date-utils'

interface InventoryOption {
  id: string
  name: string
  unit: string
}

interface ReceivingEntry {
  id: string
  item_id: string
  itemName: string
  itemUnit: string
  qty: number
  amount: number
}

export default function ReceivingPage() {
  const { profile } = useAuth()
  const branchId = profile?.branch_id ?? null

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [items, setItems] = useState<InventoryOption[]>([])
  const [entries, setEntries] = useState<ReceivingEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [selectedItem, setSelectedItem] = useState('')
  const [qty, setQty] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const fetchItems = useCallback(async () => {
    if (!branchId) return
    const { data } = await supabase
      .from('inventory_items')
      .select('id, name, unit')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('name')
    setItems(data ?? [])
  }, [branchId])

  const fetchEntries = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('daily_receiving')
        .select('id, item_id, qty, amount')
        .eq('branch_id', branchId)
        .eq('date', date)
        .order('created_at', { ascending: false })

      const mapped: ReceivingEntry[] = (data ?? []).map((d) => {
        const item = items.find((i) => i.id === d.item_id)
        return {
          id: d.id,
          item_id: d.item_id,
          itemName: item?.name ?? '-',
          itemUnit: item?.unit ?? '',
          qty: d.qty,
          amount: d.amount,
        }
      })
      setEntries(mapped)
    } finally {
      setLoading(false)
    }
  }, [branchId, date, items])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    if (items.length > 0) fetchEntries()
  }, [fetchEntries, items])

  async function handleAdd() {
    if (!branchId || !profile) return
    if (!selectedItem) {
      showWarning('กรุณาเลือกรายการ')
      return
    }
    const qtyVal = Number(qty) || 0
    const amtVal = Number(amount) || 0
    if (qtyVal <= 0 || amtVal <= 0) {
      showWarning('กรุณากรอกจำนวนและยอดเงิน')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('daily_receiving').insert({
        branch_id: branchId,
        item_id: selectedItem,
        date,
        qty: qtyVal,
        amount: amtVal,
        created_by: profile.id,
      })
      if (error) throw error
      showSuccess('เพิ่มรายการรับเข้าสำเร็จ')
      setSelectedItem('')
      setQty('')
      setAmount('')
      fetchEntries()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('daily_receiving')
        .delete()
        .eq('id', id)
      if (error) throw error
      showSuccess('ลบรายการสำเร็จ')
      fetchEntries()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  function startEdit(entry: ReceivingEntry) {
    setEditId(entry.id)
    setEditQty(String(entry.qty))
    setEditAmount(String(entry.amount))
  }

  async function saveEdit() {
    if (!editId) return
    const qtyVal = Number(editQty) || 0
    const amtVal = Number(editAmount) || 0
    if (qtyVal <= 0 || amtVal <= 0) {
      showWarning('กรุณากรอกจำนวนและยอดเงิน')
      return
    }
    try {
      const { error } = await supabase
        .from('daily_receiving')
        .update({ qty: qtyVal, amount: amtVal })
        .eq('id', editId)
      if (error) throw error
      showSuccess('แก้ไขสำเร็จ')
      setEditId(null)
      fetchEntries()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  const totalAmount = entries.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <PackagePlus className="w-6 h-6" />
        รับของเข้ารายวัน
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
          <h3 className="font-semibold mb-3">เพิ่มรายการรับเข้า</h3>
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
                {items.map((item) => (
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
            <div className="form-control w-full sm:w-40">
              <label className="label py-0">
                <span className="label-text text-xs">จำนวนเงิน (บาท)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="any"
              />
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

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          ยังไม่มีรายการรับเข้าสำหรับวันที่เลือก
        </div>
      ) : (
        <div className="card bg-base-100 shadow">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>หน่วย</th>
                  <th className="text-right">จำนวน</th>
                  <th className="text-right">จำนวนเงิน</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-medium">{entry.itemName}</td>
                    <td>{entry.itemUnit}</td>
                    <td className="text-right">
                      {editId === entry.id ? (
                        <input
                          type="number"
                          className="input input-bordered input-xs w-24 text-right"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          step="any"
                        />
                      ) : (
                        formatNumber(entry.qty, 2)
                      )}
                    </td>
                    <td className="text-right">
                      {editId === entry.id ? (
                        <input
                          type="number"
                          className="input input-bordered input-xs w-28 text-right"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          step="any"
                        />
                      ) : (
                        formatBaht(entry.amount)
                      )}
                    </td>
                    <td className="text-center">
                      {editId === entry.id ? (
                        <div className="flex justify-center gap-1">
                          <button
                            className="btn btn-success btn-xs"
                            onClick={saveEdit}
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setEditId(null)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => startEdit(entry)}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={3} className="text-right">
                    รวม
                  </td>
                  <td className="text-right">{formatBaht(totalAmount)}</td>
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
