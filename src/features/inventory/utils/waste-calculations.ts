/**
 * Waste calculations — section 1.4 of CLAUDE.md
 */
import { avgCost, avgCostFromPurchase, avgCostFallback } from './calculations'

export interface WasteEntry {
  itemId: string
  date: string
  qty: number
  type: 'trimmed' | 'untrimmed'
}

export interface WasteSummary {
  itemId: string
  itemName: string
  totalWasteQty: number
  avgCostValue: number
  totalWasteAmount: number
}

/**
 * Compute avg cost for waste using inventory data.
 * Uses purchase-based cost if available, otherwise opening-based fallback.
 */
export function wasteAvgCost(
  usageAmount: number,
  openingAmount: number,
  closingAmount: number,
  purchasedQty: number,
  openingQty: number,
): number {
  const costPurchase = avgCostFromPurchase(
    usageAmount,
    openingAmount,
    closingAmount,
    purchasedQty,
  )
  const costFb = avgCostFallback(openingAmount, openingQty)
  return avgCost(costPurchase, costFb)
}

/** Total waste qty = sum of daily waste entries */
export function totalWasteQty(entries: WasteEntry[]): number {
  return entries.reduce((sum, e) => sum + e.qty, 0)
}

/** Total waste amount = total qty x avg cost */
export function totalWasteAmount(totalQty: number, avgCostVal: number): number {
  return totalQty * avgCostVal
}
