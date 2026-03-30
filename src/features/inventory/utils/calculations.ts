/**
 * Inventory calculation functions — section 1.2 of CLAUDE.md
 * All guard against division by zero.
 */

/** Usage Qty = Opening + Total Received - Closing */
export function usageQty(
  openingQty: number,
  totalReceivedQty: number,
  closingQty: number,
): number {
  return openingQty + totalReceivedQty - closingQty
}

/** Usage Amount = Opening Amount + Total Received Amount - Closing Amount */
export function usageAmount(
  openingAmount: number,
  totalReceivedAmount: number,
  closingAmount: number,
): number {
  return openingAmount + totalReceivedAmount - closingAmount
}

/** Average daily usage = usage qty / selling days */
export function avgDailyUsage(uQty: number, sellingDays: number): number {
  if (sellingDays === 0) return 0
  return uQty / sellingDays
}

/** Closing Amount = unit price x qty */
export function closingAmountCalc(
  closingUnitPrice: number,
  closingQty: number,
): number {
  return closingUnitPrice * closingQty
}

/** Total purchased qty = usage qty - opening qty + closing qty */
export function totalPurchasedQty(
  uQty: number,
  openingQty: number,
  closingQty: number,
): number {
  return uQty - openingQty + closingQty
}

/**
 * Average cost from purchase
 * = (usage_amount - opening_amount + closing_amount) / purchased_qty
 */
export function avgCostFromPurchase(
  uAmount: number,
  openingAmount: number,
  cAmount: number,
  purchasedQty: number,
): number {
  if (purchasedQty === 0) return 0
  return (uAmount - openingAmount + cAmount) / purchasedQty
}

/** Fallback avg cost = opening_amount / opening_qty */
export function avgCostFallback(
  openingAmount: number,
  openingQty: number,
): number {
  if (openingQty === 0) return 0
  return openingAmount / openingQty
}

/** Use purchase-based cost if > 0, otherwise fallback */
export function avgCost(
  costFromPurchase: number,
  costFallback: number,
): number {
  return costFromPurchase > 0 ? costFromPurchase : costFallback
}

/** Usage per 10,000 baht of sales */
export function usagePer10000(
  uQty: number,
  totalMonthlySales: number,
): number {
  if (totalMonthlySales === 0) return 0
  return (uQty / totalMonthlySales) * 10000
}

/** Usage per 1,000 baht of sales */
export function usagePer1000(
  uQty: number,
  totalMonthlySales: number,
): number {
  if (totalMonthlySales === 0) return 0
  return (uQty / totalMonthlySales) * 1000
}
