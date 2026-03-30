import { safeDivide } from '../../../lib/currency'

export interface FixedExpense {
  code: string
  amount: number
  units?: number | null
  label?: string | null
}

export interface VariableExpenseEntry {
  code: string
  date: string
  amount: number
  units: number
}

export interface DepreciationSettings {
  totalDepreciation: number
  leaseMonths: number
}

/** คำนวณค่าเสื่อม (0601) = ค่าเสื่อมทั้งหมด / ระยะเวลาสัญญาเช่า(เดือน) */
export function calculateDepreciation(settings: DepreciationSettings): number {
  return safeDivide(settings.totalDepreciation, settings.leaseMonths)
}

/** รวมค่าใช้จ่ายรายวัน (variable) เป็นยอดรวมเดือน ต่อ code */
export function aggregateVariableExpenses(
  entries: VariableExpenseEntry[],
): Map<string, { totalAmount: number; totalUnits: number }> {
  const result = new Map<string, { totalAmount: number; totalUnits: number }>()

  for (const entry of entries) {
    const existing = result.get(entry.code) || { totalAmount: 0, totalUnits: 0 }
    existing.totalAmount += entry.amount || 0
    existing.totalUnits += entry.units || 0
    result.set(entry.code, existing)
  }

  return result
}

/** รวม COGS items (0206, 0207) */
export function calculateCOGSExpenses(expenses: FixedExpense[]): number {
  return expenses
    .filter((e) => e.code === '0206' || e.code === '0207')
    .reduce((sum, e) => sum + (e.amount || 0), 0)
}

/** รวม Controllable Expenses (0401-0415) */
export function calculateControllableTotal(expenses: FixedExpense[]): number {
  return expenses
    .filter((e) => {
      const num = parseInt(e.code, 10)
      return num >= 401 && num <= 415
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0)
}

/** รวม Non-controllable Expenses (0501-0510) */
export function calculateNonControllableTotal(expenses: FixedExpense[]): number {
  return expenses
    .filter((e) => {
      const num = parseInt(e.code, 10)
      return num >= 501 && num <= 510
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0)
}

/** รวมค่าใช้จ่ายตามกลุ่ม code prefix */
export function calculateSectionTotal(expenses: FixedExpense[], codes: string[]): number {
  return expenses
    .filter((e) => codes.includes(e.code))
    .reduce((sum, e) => sum + (e.amount || 0), 0)
}
