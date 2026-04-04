import { safeDivide } from '../../../lib/currency'

export interface IngredientCost {
  itemId: string
  itemName: string
  unit: string
  quantity: number
  avgCost: number
  totalCost: number
}

/**
 * ผลคำนวณต้นทุนทั้งหมดของ variant (ครอบคลุมทุกชั้นต้นทุน)
 */
export interface VariantCostResult {
  // ชั้นที่ 1: วัตถุดิบ
  ingredients: IngredientCost[]
  ingredientCost: number

  // ชั้นที่ 2-4: ต้นทุนเพิ่มเติม (optional — 0 ถ้าไม่ใช้)
  packagingCost: number
  gpPlatformAmount: number
  otherVariableCost: number

  // ผลรวม
  totalVariableCost: number
  sellingPrice: number
  contributionMargin: number
  foodCostPct: number
  totalCostPct: number
}

/**
 * คำนวณต้นทุนรวมของ variant หนึ่ง — รองรับทุกประเภทร้าน
 *
 * ร้านเหล้า: กรอกแค่ ingredients → เห็น food cost %
 * ร้าน Delivery: กรอกครบ → เห็น total cost % + contribution margin
 */
export function calculateVariantCost(
  ingredients: { itemId: string; itemName: string; unit: string; quantity: number }[],
  avgCosts: Record<string, number>,
  sellingPrice: number,
  packagingCost = 0,
  gpPlatformPct = 0,
  otherVariableCost = 0,
): VariantCostResult {
  // ชั้นที่ 1: ต้นทุนวัตถุดิบ
  const ingredientCosts: IngredientCost[] = ingredients.map((ing) => {
    const avgCost = avgCosts[ing.itemId] ?? 0
    return {
      itemId: ing.itemId,
      itemName: ing.itemName,
      unit: ing.unit,
      quantity: ing.quantity,
      avgCost,
      totalCost: ing.quantity * avgCost,
    }
  })
  const ingredientCost = ingredientCosts.reduce((s, i) => s + i.totalCost, 0)

  // ชั้นที่ 2: บรรจุภัณฑ์ (ถ้ามี)
  // ชั้นที่ 3: ค่า GP Platform = ราคาขาย × %
  const gpPlatformAmount = sellingPrice * gpPlatformPct
  // ชั้นที่ 4: ต้นทุนผันแปรอื่นๆ (ถ้ามี)

  // ผลรวม
  const totalVariableCost = ingredientCost + packagingCost + gpPlatformAmount + otherVariableCost
  const contributionMargin = sellingPrice - totalVariableCost
  const foodCostPct = safeDivide(ingredientCost, sellingPrice) * 100
  const totalCostPct = safeDivide(totalVariableCost, sellingPrice) * 100

  return {
    ingredients: ingredientCosts,
    ingredientCost,
    packagingCost,
    gpPlatformAmount,
    otherVariableCost,
    totalVariableCost,
    sellingPrice,
    contributionMargin,
    foodCostPct,
    totalCostPct,
  }
}

/**
 * คำนวณ BEP (Break-Even Point) — จำนวนขั้นต่ำต่อวัน
 */
export function calculateBEP(
  fixedCostPerMonth: number,
  workingDaysPerMonth: number,
  contributionMarginPerUnit: number,
): { fixedCostPerDay: number; bepUnitsPerDay: number; bepRevenuePerDay: number; sellingPrice: number } {
  const fixedCostPerDay = safeDivide(fixedCostPerMonth, workingDaysPerMonth)
  const bepUnitsPerDay = safeDivide(fixedCostPerDay, contributionMarginPerUnit)
  return {
    fixedCostPerDay,
    bepUnitsPerDay,
    bepRevenuePerDay: 0, // caller multiplies by selling price
    sellingPrice: 0,
  }
}
