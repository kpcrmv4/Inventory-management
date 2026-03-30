/**
 * Par Stock calculations — section 1.6 of CLAUDE.md
 * Safety stock default = 2%
 */

/** Estimated monthly usage = (usage_per_10000 x monthly_sales_target) / 10000 */
export function estimatedMonthlyUsage(
  usagePer10000: number,
  monthlySalesTarget: number,
): number {
  return (usagePer10000 * monthlySalesTarget) / 10000
}

/** With safety stock = estimated x (1 + safety%) */
export function withSafetyStock(
  estimatedUsage: number,
  safetyPct: number,
): number {
  return estimatedUsage * (1 + safetyPct)
}

/** Estimated cost = with_safety x avg_cost */
export function estimatedCost(
  withSafety: number,
  avgCost: number,
): number {
  return withSafety * avgCost
}

/** Daily par = (with_safety / monthly_sales_target) x daily_sales_target */
export function dailyPar(
  withSafety: number,
  monthlySalesTarget: number,
  dailySalesTarget: number,
): number {
  if (monthlySalesTarget === 0) return 0
  return (withSafety / monthlySalesTarget) * dailySalesTarget
}
