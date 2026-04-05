import { useState, useMemo } from 'react'
import {
  Save,
  Plus,
  Trash2,
  Home,
  Calculator,
  Snowflake,
  Flame,
  Settings,
} from 'lucide-react'
import { useBranch } from '../../../hooks/useBranch'
import { useExpenses } from '../hooks/useExpenses'
import { calculateDepreciation } from '../utils/expense-calculations'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { formatMonthYear, toBuddhistYear } from '../../../lib/date-utils'
import { THAI_MONTHS, PL_CODES } from '../../../lib/constants'

interface FixedExpenseField {
  code: string
  label: string
  hasUnits?: boolean
  unitsLabel?: string
}

const FIXED_EXPENSE_FIELDS: FixedExpenseField[] = [
  { code: '0401', label: PL_CODES['0401'], hasUnits: true, unitsLabel: 'หน่วย (kWh)' },
  { code: '0402', label: PL_CODES['0402'], hasUnits: true, unitsLabel: 'หน่วย' },
  { code: '0403', label: PL_CODES['0403'] },
  { code: '0501', label: PL_CODES['0501'] },
  { code: '0502', label: PL_CODES['0502'] },
  { code: '0505', label: PL_CODES['0505'] },
]

const CONTROLLABLE_CODES = ['0404', '0405', '0406', '0407', '0408', '0409', '0410', '0411']
const CUSTOM_CONTROLLABLE_CODES = ['0412', '0413', '0414', '0415']
const CUSTOM_NON_CONTROLLABLE_CODES = ['0506', '0507', '0508', '0509', '0510']

interface VariableExpenseRow {
  id?: string
  code: string
  date: string
  amount: number
  units: number
}

export default function ExpensesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { activeBranch } = useBranch()
  const branchId = activeBranch?.id ?? null

  const {
    fixedExpenses,
    setFixedExpenses,
    variableExpenses,
    depreciation,
    setDepreciation,
    loading,
    saving,
    saveFixedExpenses,
    saveVariableExpense,
    deleteVariableExpense,
    saveDepreciation,
  } = useExpenses(branchId, month, year)

  // Custom labels state
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({})

  // Variable expense input state
  const [newIce, setNewIce] = useState<VariableExpenseRow>({
    code: '0206',
    date: '',
    amount: 0,
    units: 0,
  })
  const [newGas, setNewGas] = useState<VariableExpenseRow>({
    code: '0207',
    date: '',
    amount: 0,
    units: 0,
  })

  const getFixedValue = (code: string, field: 'amount' | 'units'): number => {
    const item = fixedExpenses.find((e) => e.code === code)
    if (field === 'units') return item?.units || 0
    return item?.amount || 0
  }

  const setFixedValue = (code: string, field: 'amount' | 'units', value: number) => {
    setFixedExpenses((prev) => {
      const exists = prev.find((e) => e.code === code)
      if (exists) {
        return prev.map((e) =>
          e.code === code ? { ...e, [field]: value } : e,
        )
      }
      return [...prev, { code, amount: field === 'amount' ? value : 0, units: field === 'units' ? value : null, date: null, label: null }]
    })
  }

  const parseNum = (val: string) => {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  // Depreciation calculation
  const monthlyDepreciation = useMemo(
    () =>
      calculateDepreciation({
        totalDepreciation: depreciation.totalDepreciation,
        leaseMonths: depreciation.leaseMonths,
      }),
    [depreciation],
  )

  // Variable totals
  const iceEntries = variableExpenses.filter((v) => v.code === '0206')
  const gasEntries = variableExpenses.filter((v) => v.code === '0207')
  const iceTotal = iceEntries.reduce((s, e) => s + e.amount, 0)
  const gasTotal = gasEntries.reduce((s, e) => s + e.amount, 0)

  // Controllable total
  const controllableTotal = useMemo(() => {
    const allCodes = [...CONTROLLABLE_CODES, ...CUSTOM_CONTROLLABLE_CODES]
    return allCodes.reduce((sum, code) => sum + getFixedValue(code, 'amount'), 0)
  }, [fixedExpenses])

  // Non-controllable total
  const nonControllableTotal = useMemo(() => {
    const fixedNonCtrl = ['0501', '0502', '0503', '0504', '0505']
    const allCodes = [...fixedNonCtrl, ...CUSTOM_NON_CONTROLLABLE_CODES]
    return allCodes.reduce((sum, code) => sum + getFixedValue(code, 'amount'), 0)
  }, [fixedExpenses])

  const handleSaveFixed = () => {
    saveFixedExpenses(fixedExpenses)
  }

  const handleAddIce = () => {
    if (!newIce.date) return
    saveVariableExpense({
      code: '0206',
      date: newIce.date,
      amount: newIce.amount,
      units: newIce.units,
      label: 'น้ำแข็ง',
    })
    setNewIce({ code: '0206', date: '', amount: 0, units: 0 })
  }

  const handleAddGas = () => {
    if (!newGas.date) return
    saveVariableExpense({
      code: '0207',
      date: newGas.date,
      amount: newGas.amount,
      units: newGas.units,
      label: 'แก๊ส',
    })
    setNewGas({ code: '0207', date: '', amount: 0, units: 0 })
  }

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
        <div className="flex items-center gap-4">
          <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
            <Calculator size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ค่าใช้จ่าย</h1>
            <p className="text-base-content/50 text-sm mt-0.5">{formatMonthYear(month, year)}</p>
          </div>
        </div>
        <div className="flex gap-2">
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
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>
                {toBuddhistYear(y)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ค่าใช้จ่ายคงที่ (Fixed) */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Home className="w-5 h-5" />
            ค่าใช้จ่ายคงที่ (รายเดือน)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIXED_EXPENSE_FIELDS.map((field) => (
              <div key={field.code} className="form-control">
                <label className="label">
                  <span className="label-text">
                    {field.code} {field.label}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input input-bordered input-sm flex-1 text-right"
                    value={getFixedValue(field.code, 'amount') || ''}
                    onChange={(e) =>
                      setFixedValue(field.code, 'amount', parseNum(e.target.value))
                    }
                    placeholder="จำนวนเงิน"
                  />
                  {field.hasUnits && (
                    <input
                      type="number"
                      className="input input-bordered input-sm w-28 text-right"
                      value={getFixedValue(field.code, 'units') || ''}
                      onChange={(e) =>
                        setFixedValue(field.code, 'units', parseNum(e.target.value))
                      }
                      placeholder={field.unitsLabel}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ค่าเสื่อม (0601) */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Calculator className="w-5 h-5" />
            ค่าเสื่อมและค่าตัดจำหน่าย (0601)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">ค่าเสื่อมทั้งหมด (บาท)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={depreciation.totalDepreciation || ''}
                onChange={(e) =>
                  setDepreciation((p) => ({
                    ...p,
                    totalDepreciation: parseNum(e.target.value),
                  }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">ระยะเวลาสัญญาเช่า (เดือน)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={depreciation.leaseMonths || ''}
                onChange={(e) =>
                  setDepreciation((p) => ({
                    ...p,
                    leaseMonths: Math.max(1, parseNum(e.target.value)),
                  }))
                }
                placeholder="1"
                min={1}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">ค่าเสื่อมต่อเดือน</span>
              </label>
              <div className="input input-bordered input-sm flex items-center text-right bg-base-200 font-semibold">
                {formatBaht(monthlyDepreciation)}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => saveDepreciation(depreciation)}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              บันทึกค่าเสื่อม
            </button>
          </div>
        </div>
      </div>

      {/* ค่าใช้จ่ายรายวัน: น้ำแข็ง (0206) */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Snowflake className="w-5 h-5" />
            ค่าน้ำแข็ง (0206) - รายวัน
          </h2>

          {/* รายการที่บันทึกแล้ว */}
          {iceEntries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th className="text-right">จำนวนถุง</th>
                    <th className="text-right">จำนวนเงิน</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {iceEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td className="text-right">{formatNumber(entry.units || 0, 0)}</td>
                      <td className="text-right">{formatBaht(entry.amount)}</td>
                      <td>
                        {entry.id && (
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => deleteVariableExpense(entry.id!)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td>รวม</td>
                    <td className="text-right">
                      {formatNumber(iceEntries.reduce((s, e) => s + (e.units || 0), 0), 0)}
                    </td>
                    <td className="text-right">{formatBaht(iceTotal)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* เพิ่มรายการใหม่ */}
          <div className="flex flex-wrap gap-2 items-end mt-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">วันที่</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={newIce.date}
                onChange={(e) => setNewIce((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">จำนวนถุง</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm w-24 text-right"
                value={newIce.units || ''}
                onChange={(e) => setNewIce((p) => ({ ...p, units: parseNum(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">จำนวนเงิน</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm w-28 text-right"
                value={newIce.amount || ''}
                onChange={(e) => setNewIce((p) => ({ ...p, amount: parseNum(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddIce} disabled={saving}>
              <Plus className="w-4 h-4" />
              เพิ่ม
            </button>
          </div>
        </div>
      </div>

      {/* ค่าใช้จ่ายรายวัน: แก๊ส (0207) */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Flame className="w-5 h-5" />
            ค่าแก๊ส (0207) - รายวัน
          </h2>

          {gasEntries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th className="text-right">จำนวนถัง</th>
                    <th className="text-right">จำนวนเงิน</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {gasEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td className="text-right">{formatNumber(entry.units || 0, 0)}</td>
                      <td className="text-right">{formatBaht(entry.amount)}</td>
                      <td>
                        {entry.id && (
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => deleteVariableExpense(entry.id!)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td>รวม</td>
                    <td className="text-right">
                      {formatNumber(gasEntries.reduce((s, e) => s + (e.units || 0), 0), 0)}
                    </td>
                    <td className="text-right">{formatBaht(gasTotal)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-end mt-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">วันที่</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={newGas.date}
                onChange={(e) => setNewGas((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">จำนวนถัง</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm w-24 text-right"
                value={newGas.units || ''}
                onChange={(e) => setNewGas((p) => ({ ...p, units: parseNum(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-xs">จำนวนเงิน</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm w-28 text-right"
                value={newGas.amount || ''}
                onChange={(e) => setNewGas((p) => ({ ...p, amount: parseNum(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddGas} disabled={saving}>
              <Plus className="w-4 h-4" />
              เพิ่ม
            </button>
          </div>
        </div>
      </div>

      {/* Controllable Expenses (0404-0415) */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body">
          <h2 className="card-title text-lg">
            <Settings className="w-5 h-5" />
            ค่าใช้จ่ายที่ควบคุมได้ (Controllable)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CONTROLLABLE_CODES.map((code) => (
              <div key={code} className="form-control">
                <label className="label">
                  <span className="label-text">
                    {code} {PL_CODES[code as keyof typeof PL_CODES]}
                  </span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm text-right"
                  value={getFixedValue(code, 'amount') || ''}
                  onChange={(e) => setFixedValue(code, 'amount', parseNum(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            ))}

            {/* Custom controllable (0412-0415) */}
            {CUSTOM_CONTROLLABLE_CODES.map((code) => (
              <div key={code} className="form-control">
                <label className="label">
                  <span className="label-text">{code}</span>
                  <input
                    type="text"
                    className="input input-bordered input-xs w-40"
                    value={
                      customLabels[code] ??
                      fixedExpenses.find((e) => e.code === code)?.label ??
                      ''
                    }
                    onChange={(e) =>
                      setCustomLabels((p) => ({ ...p, [code]: e.target.value }))
                    }
                    placeholder="ตั้งชื่อรายการ"
                  />
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm text-right"
                  value={getFixedValue(code, 'amount') || ''}
                  onChange={(e) => setFixedValue(code, 'amount', parseNum(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <div className="text-right mt-2 font-semibold">
            รวม Controllable: {formatBaht(controllableTotal)}
          </div>
        </div>
      </div>

      {/* Non-controllable Expenses (0503-0510) */}
      <div className="card bg-base-100 card-enhanced">
        <div className="card-body">
          <h2 className="card-title text-lg">ค่าใช้จ่ายที่ควบคุมไม่ได้ (Non-controllable)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">0503 {PL_CODES['0503']}</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={getFixedValue('0503', 'amount') || ''}
                onChange={(e) => setFixedValue('0503', 'amount', parseNum(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">0504 {PL_CODES['0504']}</span>
              </label>
              <div className="input input-bordered input-sm flex items-center text-right bg-base-200">
                คำนวณจาก Daily Sale
              </div>
            </div>

            {CUSTOM_NON_CONTROLLABLE_CODES.map((code) => (
              <div key={code} className="form-control">
                <label className="label">
                  <span className="label-text">{code}</span>
                  <input
                    type="text"
                    className="input input-bordered input-xs w-40"
                    value={
                      customLabels[code] ??
                      fixedExpenses.find((e) => e.code === code)?.label ??
                      ''
                    }
                    onChange={(e) =>
                      setCustomLabels((p) => ({ ...p, [code]: e.target.value }))
                    }
                    placeholder="ตั้งชื่อรายการ"
                  />
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm text-right"
                  value={getFixedValue(code, 'amount') || ''}
                  onChange={(e) => setFixedValue(code, 'amount', parseNum(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
          <div className="text-right mt-2 font-semibold">
            รวม Non-controllable: {formatBaht(nonControllableTotal)}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-2 pb-6">
        <button className="btn btn-primary" onClick={handleSaveFixed} disabled={saving}>
          {saving ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          บันทึกค่าใช้จ่ายทั้งหมด
        </button>
      </div>
    </div>
  )
}
