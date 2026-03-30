import { safeDivide } from '../../../lib/currency'

export interface ChannelSaleEntry {
  channelId: string
  amount: number
  bills: number
  heads: number
  gpCommission: number
}

export interface DiscountEntry {
  code: string // '0111' | '0112' | '0113'
  amount: number
}

export interface DailySaleSummary {
  totalRevenue: number
  totalDiscount: number
  netRevenue: number
  totalBills: number
  totalHeads: number
  totalGpCommission: number
}

export interface DTDSummary {
  dtdTarget: number
  dtdActual: number
  dtdDifference: number
  dtdAchievementPct: number
}

/** รวมรายได้ทุกช่องทาง */
export function calculateTotalRevenue(entries: ChannelSaleEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.amount || 0), 0)
}

/** รวมส่วนลดทั้งหมด (0111 + 0112 + 0113) */
export function calculateTotalDiscount(discounts: DiscountEntry[]): number {
  return discounts.reduce((sum, d) => sum + Math.abs(d.amount || 0), 0)
}

/** รายได้สุทธิ = รายได้ - ส่วนลด */
export function calculateNetRevenue(totalRevenue: number, totalDiscount: number): number {
  return totalRevenue - totalDiscount
}

/** รวม GP Commission ทั้งหมด */
export function calculateTotalGpCommission(entries: ChannelSaleEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.gpCommission || 0), 0)
}

/** สรุปยอดขายรายวัน */
export function calculateDailySummary(
  entries: ChannelSaleEntry[],
  discounts: DiscountEntry[],
): DailySaleSummary {
  const totalRevenue = calculateTotalRevenue(entries)
  const totalDiscount = calculateTotalDiscount(discounts)
  const netRevenue = calculateNetRevenue(totalRevenue, totalDiscount)
  const totalBills = entries.reduce((sum, e) => sum + (e.bills || 0), 0)
  const totalHeads = entries.reduce((sum, e) => sum + (e.heads || 0), 0)
  const totalGpCommission = calculateTotalGpCommission(entries)

  return {
    totalRevenue,
    totalDiscount,
    netRevenue,
    totalBills,
    totalHeads,
    totalGpCommission,
  }
}

/** คำนวณ DTD (Date-to-Date) สะสม */
export function calculateDTD(
  targets: { date: string; target_amount: number }[],
  sales: { date: string; amount: number }[],
  upToDate: string,
): DTDSummary {
  const dtdTarget = targets
    .filter((t) => t.date <= upToDate)
    .reduce((sum, t) => sum + (t.target_amount || 0), 0)

  const dtdActual = sales
    .filter((s) => s.date <= upToDate)
    .reduce((sum, s) => sum + (s.amount || 0), 0)

  const dtdDifference = dtdActual - dtdTarget
  const dtdAchievementPct = safeDivide(dtdActual, dtdTarget) * 100

  return { dtdTarget, dtdActual, dtdDifference, dtdAchievementPct }
}
