import { safeDivide } from '../../../lib/currency'

export interface IngredientCost {
  itemId: string
  itemName: string
  unit: string
  quantity: number
  avgCost: number
  totalCost: number
}

export interface VariantCostResult {
  variantId: string
  variantName: string
  sellingPrice: number
  ingredients: IngredientCost[]
  totalCost: number
  foodCostPct: number
  profitPerDish: number
}

/**
 * คำนวณต้นทุนต่อจานของ variant หนึ่ง
 * @param ingredients - วัตถุดิบพร้อมปริมาณ
 * @param avgCosts - Map<item_id, avg_cost per unit> จาก inventory
 * @param sellingPrice - ราคาขาย
 */
export function calculateVariantCost(
  ingredients: { itemId: string; itemName: string; unit: string; quantity: number }[],
  avgCosts: Record<string, number>,
  sellingPrice: number,
): { ingredients: IngredientCost[]; totalCost: number; foodCostPct: number; profitPerDish: number } {
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

  const totalCost = ingredientCosts.reduce((s, i) => s + i.totalCost, 0)
  const foodCostPct = safeDivide(totalCost, sellingPrice) * 100
  const profitPerDish = sellingPrice - totalCost

  return { ingredients: ingredientCosts, totalCost, foodCostPct, profitPerDish }
}
