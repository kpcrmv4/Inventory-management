import { useEffect, useState, useCallback } from 'react'
import {
  PackagePlus,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Calendar,
  Package,
} from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useBranch } from '../../../hooks/useBranch'
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
  const { activeBranch } = useBranch()
  const branchId = activeBranch?.id ?? null

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
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
          <PackagePlus size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">รับของเข้ารายวัน</h1>
          <p className="text-sm text-base-content/50">บันทึกรายการรับวัตถุดิบเข้าคลัง</p>
        </div>
      </div>

      {/* Date picker */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body p-4 flex flex-row items-center gap-3">
          <div className="icon-box-sm bg-primary/10 text-primary rounded-lg">
            <Calendar size={16} />
          </div>
          <input
            type="date"
            className="input input-bordered input-sm flex-1 max-w-xs"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <span className="text-sm text-base-content/50 font-medium">
            {formatThaiDate(date)}
          </span>
        </div>
      </div>

      {/* Add form */}
      <div className="form-section">
        <h3 className="font-bold text-base flex items-center gap-2 mb-4">
          <div className="icon-circle-sm bg-primary/10">
            <Plus size={16} className="text-primary" />
          </div>
          เพิ่มรายการรับเข้า
        </h3>
        <div className="space-y-3">
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs font-semibold text-base-content/60">รายการ</span>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold text-base-content/60">จำนวน</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                min={0}
                step="any"
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold text-base-content/60">จำนวนเงิน (บาท)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="any"
              />
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm w-full gap-1"
            onClick={handleAdd}
            disabled={submitting}
          >
            {submitting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="empty-state-icon animate-subtle-pulse">
            <Package size={32} className="text-base-content/30" />
          </div>
          <p className="text-base-content/40 font-medium">ยังไม่มีรายการรับเข้า</p>
          <p className="text-base-content/30 text-sm mt-1">สำหรับวันที่เลือก</p>
        </div>
      ) : (
        <div className="card bg-base-100 card-enhanced">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-base-200/50">
                  <th>รายการ</th>
                  <th>หน่วย</th>
                  <th className="text-right">จำนวน</th>
                  <th className="text-right">จำนวนเงิน</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-base-200/30 transition-colors">
                    <td className="font-medium">{entry.itemName}</td>
                    <td className="text-base-content/60">{entry.itemUnit}</td>
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
                        <span className="font-mono">{formatBaht(entry.amount)}</span>
                      )}
                    </td>
                    <td className="text-center">
                      {editId === entry.id ? (
                        <div className="flex justify-center gap-1">
                          <button
                            className="btn btn-success btn-xs shadow-sm"
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
                            className="btn btn-ghost btn-xs hover:bg-primary/10 hover:text-primary"
                            onClick={() => startEdit(entry)}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs hover:bg-error/10 text-error"
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
                <tr className="font-bold bg-base-200/30">
                  <td colSpan={3} className="text-right">
                    รวมทั้งหมด
                  </td>
                  <td className="text-right font-mono text-primary">{formatBaht(totalAmount)}</td>
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
