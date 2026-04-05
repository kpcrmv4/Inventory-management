import { useState, useMemo } from 'react'
import { Calendar, Save, TrendingUp, Receipt, Percent } from 'lucide-react'
import { useBranch } from '../../../hooks/useBranch'
import { useDailySale } from '../hooks/useDailySale'
import { calculateDailySummary, calculateDTD } from '../utils/sale-calculations'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { formatThaiDate } from '../../../lib/date-utils'

function getTodayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DailySalePage() {
  const { activeBranch } = useBranch()
  const [selectedDate, setSelectedDate] = useState(getTodayISO())
  const branchId = activeBranch?.id ?? null

  const {
    channels,
    entries,
    setEntries,
    discounts,
    setDiscounts,
    vat,
    setVat,
    cashOverShort,
    setCashOverShort,
    targets,
    monthSales,
    loading,
    saving,
    save,
  } = useDailySale(branchId, selectedDate)

  const dineInChannels = channels.filter((c) => c.type === 'dine_in')
  const deliveryChannels = channels.filter((c) => c.type === 'delivery')

  const summary = useMemo(
    () => calculateDailySummary(entries, discounts),
    [entries, discounts],
  )

  const dtd = useMemo(
    () => calculateDTD(targets, monthSales, selectedDate),
    [targets, monthSales, selectedDate],
  )

  const updateEntry = (channelId: string, field: string, value: number) => {
    setEntries((prev) =>
      prev.map((e) => (e.channelId === channelId ? { ...e, [field]: value } : e)),
    )
  }

  const updateDiscount = (code: string, amount: number) => {
    setDiscounts((prev) => prev.map((d) => (d.code === code ? { ...d, amount } : d)))
  }

  const parseNum = (val: string) => {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  // Thai date display for header
  const dateObj = new Date(selectedDate)
  const thaiDateDisplay = formatThaiDate(dateObj)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">บันทึกยอดขายรายวัน</h1>
          <p className="text-base-content/60 mt-1">{thaiDateDisplay}</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            className="input input-bordered input-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            บันทึก
          </button>
        </div>
      </div>

      {/* ยอดขายหน้าร้าน */}
      {dineInChannels.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <Receipt className="w-5 h-5" />
              รายได้หน้าร้าน
            </h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ช่องทาง</th>
                    <th className="text-right">ยอดขาย (บาท)</th>
                    <th className="text-right">จำนวนบิล</th>
                    <th className="text-right">จำนวนหัว</th>
                  </tr>
                </thead>
                <tbody>
                  {dineInChannels.map((ch) => {
                    const entry = entries.find((e) => e.channelId === ch.id)
                    return (
                      <tr key={ch.id}>
                        <td className="font-medium">{ch.name}</td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-sm w-full text-right"
                            value={entry?.amount || ''}
                            onChange={(e) => updateEntry(ch.id, 'amount', parseNum(e.target.value))}
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-sm w-full text-right"
                            value={entry?.bills || ''}
                            onChange={(e) => updateEntry(ch.id, 'bills', parseNum(e.target.value))}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-sm w-full text-right"
                            value={entry?.heads || ''}
                            onChange={(e) => updateEntry(ch.id, 'heads', parseNum(e.target.value))}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ยอดขาย Delivery */}
      {deliveryChannels.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <TrendingUp className="w-5 h-5" />
              รายได้ Delivery
            </h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>แพลตฟอร์ม</th>
                    <th className="text-right">ยอดขาย (บาท)</th>
                    <th className="text-right">จำนวนบิล</th>
                    <th className="text-right">ค่า GP Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryChannels.map((ch) => {
                    const entry = entries.find((e) => e.channelId === ch.id)
                    return (
                      <tr key={ch.id}>
                        <td className="font-medium">{ch.name}</td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-sm w-full text-right"
                            value={entry?.amount || ''}
                            onChange={(e) => updateEntry(ch.id, 'amount', parseNum(e.target.value))}
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-sm w-full text-right"
                            value={entry?.bills || ''}
                            onChange={(e) => updateEntry(ch.id, 'bills', parseNum(e.target.value))}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input input-bordered input-sm w-full text-right"
                            value={entry?.gpCommission || ''}
                            onChange={(e) =>
                              updateEntry(ch.id, 'gpCommission', parseNum(e.target.value))
                            }
                            placeholder="0.00"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ส่วนลด */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Percent className="w-5 h-5" />
            ส่วนลด / VAT / เงินสด
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">0111 ส่วนลดหน้าร้าน</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={discounts.find((d) => d.code === '0111')?.amount || ''}
                onChange={(e) => updateDiscount('0111', parseNum(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">0112 ส่วนลด Delivery</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={discounts.find((d) => d.code === '0112')?.amount || ''}
                onChange={(e) => updateDiscount('0112', parseNum(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">0113 ส่วนลด Entertain</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={discounts.find((d) => d.code === '0113')?.amount || ''}
                onChange={(e) => updateDiscount('0113', parseNum(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">0114 VAT (ใส่เครื่องหมาย &quot;-&quot;)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={vat || ''}
                onChange={(e) => setVat(parseNum(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">0115 เงินสด ส่วนเกิน/ส่วนขาด</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={cashOverShort || ''}
                onChange={(e) => setCashOverShort(parseNum(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* สรุปยอดขายรายวัน */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg">สรุปยอดขายรายวัน</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">รายได้รวม</div>
              <div className="stat-value text-lg text-primary">
                {formatBaht(summary.totalRevenue)}
              </div>
              <div className="stat-desc">
                บิล: {summary.totalBills} | หัว: {summary.totalHeads}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">ส่วนลดรวม</div>
              <div className="stat-value text-lg text-error">
                -{formatBaht(summary.totalDiscount)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">รายได้สุทธิ</div>
              <div className="stat-value text-lg text-success">
                {formatBaht(summary.netRevenue)}
              </div>
            </div>
          </div>

          {(vat !== 0 || cashOverShort !== 0 || summary.totalGpCommission !== 0) && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-base-200 rounded">
                <span>VAT</span>
                <span>{formatBaht(vat)}</span>
              </div>
              <div className="flex justify-between p-2 bg-base-200 rounded">
                <span>เงินสด ส่วนเกิน/ขาด</span>
                <span>{formatBaht(cashOverShort)}</span>
              </div>
              <div className="flex justify-between p-2 bg-base-200 rounded">
                <span>GP Commission รวม</span>
                <span>{formatBaht(summary.totalGpCommission)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DTD Tracker */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Calendar className="w-5 h-5" />
            DTD (Date-to-Date) สะสม
          </h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">เป้าสะสม</div>
              <div className="stat-value text-lg">{formatBaht(dtd.dtdTarget)}</div>
            </div>
            <div className="stat">
              <div className="stat-title">ยอดขายสะสม</div>
              <div className="stat-value text-lg text-primary">{formatBaht(dtd.dtdActual)}</div>
            </div>
            <div className="stat">
              <div className="stat-title">ส่วนต่าง</div>
              <div
                className={`stat-value text-lg ${dtd.dtdDifference >= 0 ? 'text-success' : 'text-error'}`}
              >
                {dtd.dtdDifference >= 0 ? '+' : ''}
                {formatBaht(dtd.dtdDifference)}
              </div>
              <div className="stat-desc">
                {formatNumber(dtd.dtdAchievementPct, 1)}% ของเป้า
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save button (bottom) */}
      <div className="flex justify-end pb-6">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          บันทึกยอดขายรายวัน
        </button>
      </div>
    </div>
  )
}
