/**
 * P&L calculation functions — section 2.1 of CLAUDE.md
 * All guard against division by zero via safeDivide.
 */

import { safeDivide } from '../../../lib/currency'

// ─── Types ───────────────────────────────────────────────────

export interface RevenueResult {
  /** Gross revenue before discounts (sum of 0101-0110) */
  grossRevenue: number
  /** Per-channel sales breakdown (channel_code → amount) */
  salesByChannel: Record<string, number>
  /** Total discounts (0111+0112+0113, these are negative amounts) */
  totalDiscount: number
  /** Per-type discount breakdown (0111/0112/0113 → amount as negative) */
  discountsByType: Record<string, number>
  /** VAT (0114, entered as negative) */
  vat: number
  /** Cash over/short (0115) */
  cashOverShort: number
  /** Net revenue = grossRevenue + totalDiscount + vat + cashOverShort */
  netRevenue: number
}

export interface COGSResult {
  food: number       // 0201 (inventory)
  beverage: number   // 0202 (inventory)
  alcohol: number    // 0203 (inventory)
  dessert: number    // 0204 (inventory)
  packaging: number  // 0205 (inventory)
  ice: number        // 0206 (expenses)
  gas: number        // 0207 (expenses)
  total: number
}

export interface LaborResult {
  branchSalary: number      // 0301
  branchOT: number          // 0302
  branchWelfare: number     // 0303
  branchSS: number          // 0304
  branchDeductions: number  // 0305
  hqSalary: number          // 0306
  hqOT: number              // 0307
  hqWelfare: number         // 0308
  hqSS: number              // 0309
  hqDeductions: number      // 0310
  travel: number            // 0311
  medical: number           // 0312
  bonus: number             // 0313
  total: number
}

export interface ControllableResult {
  items: Record<string, number>  // codes 0401-0415
  total: number
}

export interface NonControllableResult {
  items: Record<string, number>  // codes 0501-0510
  total: number
}

export interface PercentageResult {
  pctBeforeDiscount: number
  pctAfterDiscount: number
}

export interface PLLineItem {
  code: string
  label: string
  amount: number
  pctBeforeDiscount: number
  pctAfterDiscount: number
  isReadOnly?: boolean
}

export interface FullPLReport {
  revenue: RevenueResult
  cogs: COGSResult
  labor: LaborResult
  gp: number
  controllable: ControllableResult
  pac: number
  nonControllable: NonControllableResult
  ebitda: number
  depreciation: number
  ebit: number
  interest: number
  tax: number
  netProfit: number
}

// ─── Revenue ─────────────────────────────────────────────────

/**
 * Calculate revenue section.
 * @param dailySales  Map of channel code (0101-0110) → total amount for the month
 * @param discounts   Map of discount codes (0111, 0112, 0113) → amount (positive number = discount)
 * @param extras      { vat: number (0114), cashOverShort: number (0115) }
 */
export function calculateRevenue(
  dailySales: Record<string, number>,
  discounts: Record<string, number>,
  extras: { vat: number; cashOverShort: number },
): RevenueResult {
  const grossRevenue = Object.values(dailySales).reduce((s, v) => s + v, 0)
  // Discounts stored as positive amounts, but are subtractive
  const totalDiscount = -(
    Math.abs(discounts['0111'] ?? 0) +
    Math.abs(discounts['0112'] ?? 0) +
    Math.abs(discounts['0113'] ?? 0)
  )
  const vat = -(Math.abs(extras.vat))
  const cashOverShort = extras.cashOverShort ?? 0
  const netRevenue = grossRevenue + totalDiscount + vat + cashOverShort

  const discountsByType: Record<string, number> = {
    '0111': -(Math.abs(discounts['0111'] ?? 0)),
    '0112': -(Math.abs(discounts['0112'] ?? 0)),
    '0113': -(Math.abs(discounts['0113'] ?? 0)),
  }

  return {
    grossRevenue,
    salesByChannel: dailySales,
    totalDiscount,
    discountsByType,
    vat,
    cashOverShort,
    netRevenue,
  }
}

// ─── COGS ────────────────────────────────────────────────────

/**
 * Calculate COGS section.
 * IMPORTANT: 0201-0205 are pulled from inventory usage_amount automatically.
 * @param inventoryUsage  Map of category code → usage_amount from inventory
 * @param expenses        Map with 0206 (ice) and 0207 (gas) amounts
 */
export function calculateCOGS(
  inventoryUsage: Record<string, number>,
  expenses: Record<string, number>,
): COGSResult {
  const food = (inventoryUsage['0201_dry'] ?? 0) + (inventoryUsage['0201_frozen'] ?? 0)
  const beverage = inventoryUsage['0202'] ?? 0
  const alcohol = inventoryUsage['0203'] ?? 0
  const dessert = inventoryUsage['0204'] ?? 0
  const packaging = inventoryUsage['0205'] ?? 0
  const ice = expenses['0206'] ?? 0
  const gas = expenses['0207'] ?? 0
  const total = food + beverage + alcohol + dessert + packaging + ice + gas

  return { food, beverage, alcohol, dessert, packaging, ice, gas, total }
}

// ─── Labor ───────────────────────────────────────────────────

/**
 * Calculate labor section from monthly labor data.
 * @param monthlyLabor  Map of labor code (0301-0313) → amount
 */
export function calculateLabor(
  monthlyLabor: Record<string, number>,
): LaborResult {
  const branchSalary = monthlyLabor['0301'] ?? 0
  const branchOT = monthlyLabor['0302'] ?? 0
  const branchWelfare = monthlyLabor['0303'] ?? 0
  const branchSS = monthlyLabor['0304'] ?? 0
  const branchDeductions = monthlyLabor['0305'] ?? 0
  const hqSalary = monthlyLabor['0306'] ?? 0
  const hqOT = monthlyLabor['0307'] ?? 0
  const hqWelfare = monthlyLabor['0308'] ?? 0
  const hqSS = monthlyLabor['0309'] ?? 0
  const hqDeductions = monthlyLabor['0310'] ?? 0
  const travel = monthlyLabor['0311'] ?? 0
  const medical = monthlyLabor['0312'] ?? 0
  const bonus = monthlyLabor['0313'] ?? 0
  const total =
    branchSalary + branchOT + branchWelfare + branchSS + branchDeductions +
    hqSalary + hqOT + hqWelfare + hqSS + hqDeductions +
    travel + medical + bonus

  return {
    branchSalary, branchOT, branchWelfare, branchSS, branchDeductions,
    hqSalary, hqOT, hqWelfare, hqSS, hqDeductions,
    travel, medical, bonus, total,
  }
}

// ─── GP ──────────────────────────────────────────────────────

export function calculateGP(
  netRevenue: number,
  totalCOGS: number,
  totalLabor: number,
): number {
  return netRevenue - totalCOGS - totalLabor
}

// ─── Controllable ────────────────────────────────────────────

/**
 * Calculate controllable expenses (0401-0415).
 * IMPORTANT: 0409 is pulled from inventory usage_amount for consumable supplies.
 */
export function calculateControllable(
  expenses: Record<string, number>,
): ControllableResult {
  const codes = [
    '0401', '0402', '0403', '0404', '0405',
    '0406', '0407', '0408', '0409', '0410',
    '0411', '0412', '0413', '0414', '0415',
  ]
  const items: Record<string, number> = {}
  let total = 0
  for (const code of codes) {
    const amount = expenses[code] ?? 0
    items[code] = amount
    total += amount
  }
  return { items, total }
}

// ─── PAC ─────────────────────────────────────────────────────

export function calculatePAC(gp: number, controllableTotal: number): number {
  return gp - controllableTotal
}

// ─── Non-controllable ────────────────────────────────────────

export function calculateNonControllable(
  expenses: Record<string, number>,
): NonControllableResult {
  const codes = ['0501', '0502', '0503', '0504', '0505', '0506', '0507', '0508', '0509', '0510']
  const items: Record<string, number> = {}
  let total = 0
  for (const code of codes) {
    const amount = expenses[code] ?? 0
    items[code] = amount
    total += amount
  }
  return { items, total }
}

// ─── EBITDA / EBIT / Net Profit ──────────────────────────────

export function calculateEBITDA(pac: number, nonControllableTotal: number): number {
  return pac - nonControllableTotal
}

export function calculateEBIT(ebitda: number, depreciation: number): number {
  return ebitda - depreciation
}

export function calculateNetProfit(ebit: number, interest: number, tax: number): number {
  return ebit - interest - tax
}

// ─── Percentages ─────────────────────────────────────────────

/**
 * Calculate %before discount and %after discount for a given amount.
 * @param amount               The P&L line amount
 * @param revenueBeforeDiscount  Revenue before all discounts (grossRevenue)
 * @param revenueAfterDiscount   Net revenue after discounts
 */
export function calculatePercentages(
  amount: number,
  revenueBeforeDiscount: number,
  revenueAfterDiscount: number,
): PercentageResult {
  return {
    pctBeforeDiscount: safeDivide(amount, revenueBeforeDiscount) * 100,
    pctAfterDiscount: safeDivide(amount, revenueAfterDiscount) * 100,
  }
}

// ─── Full P&L computation ────────────────────────────────────

/**
 * Compute the entire P&L from raw data sources.
 */
export function computeFullPL(params: {
  dailySales: Record<string, number>
  discounts: Record<string, number>
  vat: number
  cashOverShort: number
  inventoryUsage: Record<string, number>
  monthlyExpenses: Record<string, number>
  monthlyLabor: Record<string, number>
  depreciation: number
  interest: number
  tax: number
}): FullPLReport {
  const revenue = calculateRevenue(
    params.dailySales,
    params.discounts,
    { vat: params.vat, cashOverShort: params.cashOverShort },
  )

  const cogs = calculateCOGS(params.inventoryUsage, params.monthlyExpenses)
  const labor = calculateLabor(params.monthlyLabor)
  const gp = calculateGP(revenue.netRevenue, cogs.total, labor.total)

  // Merge inventory 0409 into expenses for controllable
  const controllableExpenses = {
    ...params.monthlyExpenses,
    '0409': params.inventoryUsage['0409'] ?? 0,
  }
  const controllable = calculateControllable(controllableExpenses)
  const pac = calculatePAC(gp, controllable.total)

  const nonControllable = calculateNonControllable(params.monthlyExpenses)
  const ebitda = calculateEBITDA(pac, nonControllable.total)
  const ebit = calculateEBIT(ebitda, params.depreciation)
  const netProfit = calculateNetProfit(ebit, params.interest, params.tax)

  return {
    revenue, cogs, labor, gp,
    controllable, pac,
    nonControllable, ebitda,
    depreciation: params.depreciation,
    ebit,
    interest: params.interest,
    tax: params.tax,
    netProfit,
  }
}
