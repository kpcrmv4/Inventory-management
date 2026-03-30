import { safeDivide } from '../../../lib/currency'

/** คำนวณค่า OT = (salary/30/8) * multiplier * hours */
export function calculateOT(salary: number, hours: number, multiplier: number): number {
  if (hours <= 0 || salary <= 0) return 0
  return safeDivide(salary, 30) / 8 * multiplier * hours
}

/** คำนวณค่าหักมาสาย = (salary/30/8/60) * minutes */
export function calculateLateDeduction(salary: number, minutes: number): number {
  if (minutes <= 0 || salary <= 0) return 0
  return -(safeDivide(salary, 30) / 8 / 60 * minutes)
}

/** คำนวณค่าหักลา/ขาดงาน = (salary/30) * days */
export function calculateLeaveDeduction(salary: number, days: number): number {
  if (days <= 0 || salary <= 0) return 0
  return -(safeDivide(salary, 30) * days)
}

export interface IncomeFields {
  salary: number
  ot1xAmount: number
  ot15xAmount: number
  ot3xAmount: number
  otCustom: number
  serviceCharge: number
  incentive: number
  foodAllowance: number
  transportAllowance: number
  diligence: number
}

/** รวมรายได้ทั้งหมด */
export function calculateTotalIncome(fields: IncomeFields): number {
  return (
    (fields.salary || 0) +
    (fields.ot1xAmount || 0) +
    (fields.ot15xAmount || 0) +
    (fields.ot3xAmount || 0) +
    (fields.otCustom || 0) +
    (fields.serviceCharge || 0) +
    (fields.incentive || 0) +
    (fields.foodAllowance || 0) +
    (fields.transportAllowance || 0) +
    (fields.diligence || 0)
  )
}

export interface DeductionFields {
  sickLeaveAmount: number
  personalLeaveAmount: number
  absentAmount: number
  lateAmount: number
  loanDeduction: number
  taxDeduction: number
  socialSecurity: number
}

/** รวมรายหักทั้งหมด (ค่าลบ) */
export function calculateTotalDeductions(fields: DeductionFields): number {
  return (
    (fields.sickLeaveAmount || 0) +
    (fields.personalLeaveAmount || 0) +
    (fields.absentAmount || 0) +
    (fields.lateAmount || 0) -
    Math.abs(fields.loanDeduction || 0) -
    Math.abs(fields.taxDeduction || 0) -
    Math.abs(fields.socialSecurity || 0)
  )
}

/** คำนวณจ่ายสุทธิ = รายได้รวม + รายหักรวม (รายหักเป็นค่าลบ) */
export function calculateNetPay(totalIncome: number, totalDeductions: number): number {
  return totalIncome + totalDeductions
}

/** สร้างข้อมูล labor record ที่คำนวณค่าอัตโนมัติครบ */
export function computeLaborRecord(input: {
  salary: number
  ot1xHours: number
  ot15xHours: number
  ot3xHours: number
  otCustom: number
  serviceCharge: number
  incentive: number
  foodAllowance: number
  transportAllowance: number
  diligence: number
  sickLeaveDays: number
  personalLeaveDays: number
  absentDays: number
  lateMinutes: number
  loanDeduction: number
  taxDeduction: number
  socialSecurity: number
}) {
  const ot1xAmount = calculateOT(input.salary, input.ot1xHours, 1)
  const ot15xAmount = calculateOT(input.salary, input.ot15xHours, 1.5)
  const ot3xAmount = calculateOT(input.salary, input.ot3xHours, 3)

  const sickLeaveAmount = calculateLeaveDeduction(input.salary, input.sickLeaveDays)
  const personalLeaveAmount = calculateLeaveDeduction(input.salary, input.personalLeaveDays)
  const absentAmount = calculateLeaveDeduction(input.salary, input.absentDays)
  const lateAmount = calculateLateDeduction(input.salary, input.lateMinutes)

  const totalIncome = calculateTotalIncome({
    salary: input.salary,
    ot1xAmount,
    ot15xAmount,
    ot3xAmount,
    otCustom: input.otCustom,
    serviceCharge: input.serviceCharge,
    incentive: input.incentive,
    foodAllowance: input.foodAllowance,
    transportAllowance: input.transportAllowance,
    diligence: input.diligence,
  })

  const totalDeductions = calculateTotalDeductions({
    sickLeaveAmount,
    personalLeaveAmount,
    absentAmount,
    lateAmount,
    loanDeduction: input.loanDeduction,
    taxDeduction: input.taxDeduction,
    socialSecurity: input.socialSecurity,
  })

  const netPay = calculateNetPay(totalIncome, totalDeductions)

  return {
    ot1xAmount,
    ot15xAmount,
    ot3xAmount,
    sickLeaveAmount,
    personalLeaveAmount,
    absentAmount,
    lateAmount,
    totalIncome,
    totalDeductions,
    netPay,
  }
}
