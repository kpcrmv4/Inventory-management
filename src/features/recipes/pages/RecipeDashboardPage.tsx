import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, ExternalLink, Filter } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { RECIPE_CATEGORIES } from '../../../lib/constants'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { calculateVariantCost, calculateBEP } from '../utils/recipe-calculations'
import type { RecipeCategory } from '../../../types/database'

interface DashboardVariant {
  recipeId: string
  recipeName: string
  recipeCategory: RecipeCategory
  variantId: string
  variantName: string
  sellingPrice: number
  packagingCost: number
  gpPlatformPct: number
  otherVariableCost: number
  ingredients: { itemId: string; itemName: string; unit: string; quantity: number }[]
}

export default function RecipeDashboardPage() {
  const { profile } = useAuth()
  const [variants, setVariants] = useState<DashboardVariant[]>([])
  const [avgCosts, setAvgCosts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<RecipeCategory | ''>('')
  const [search, setSearch] = useState('')

  // BEP calculator state
  const [fixedCost, setFixedCost] = useState('')
  const [workingDays, setWorkingDays] = useState('26')
  const [bepVariantId, setBepVariantId] = useState('')

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return

    setLoading(true)
    try {
      // Fetch all active recipes with variants and ingredients
      const { data: recipes } = await supabase
        .from('recipes')
        .select(`
          id, name, category,
          recipe_variants (
            id, name, selling_price, packaging_cost, gp_platform_pct, other_variable_cost,
            is_default, sort_order,
            recipe_ingredients (
              id, item_id, quantity,
              inventory_items ( name, unit )
            )
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('name')

      if (recipes) {
        const allVariants: DashboardVariant[] = []
        for (const r of recipes) {
          for (const v of (r.recipe_variants ?? []) as any[]) {
            allVariants.push({
              recipeId: r.id,
              recipeName: r.name,
              recipeCategory: r.category,
              variantId: v.id,
              variantName: v.name,
              sellingPrice: v.selling_price,
              packagingCost: v.packaging_cost ?? 0,
              gpPlatformPct: v.gp_platform_pct ?? 0,
              otherVariableCost: v.other_variable_cost ?? 0,
              ingredients: (v.recipe_ingredients ?? []).map((ri: any) => ({
                itemId: ri.item_id,
                itemName: ri.inventory_items?.name ?? '',
                unit: ri.inventory_items?.unit ?? '',
                quantity: ri.quantity,
              })),
            })
          }
        }
        setVariants(allVariants)
      }

      // Fetch avg costs
      const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .limit(1)

      if (branches && branches.length > 0) {
        const now = new Date()
        const { data: usageData } = await supabase.rpc('calculate_inventory_usage', {
          p_branch_id: branches[0].id,
          p_month: now.getMonth() + 1,
          p_year: now.getFullYear(),
        })

        const costs: Record<string, number> = {}
        if (usageData) {
          for (const row of usageData as any[]) {
            if (row.avg_cost > 0) {
              costs[row.item_id] = row.avg_cost
            }
          }
        }
        setAvgCosts(costs)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Compute cost results for all variants
  const costResults = useMemo(() => {
    return variants.map((v) => ({
      variant: v,
      cost: calculateVariantCost(
        v.ingredients,
        avgCosts,
        v.sellingPrice,
        v.packagingCost,
        v.gpPlatformPct,
        v.otherVariableCost,
      ),
    }))
  }, [variants, avgCosts])

  // Filtered results
  const filtered = useMemo(() => {
    return costResults.filter(({ variant }) => {
      if (filterCategory && variant.recipeCategory !== filterCategory) return false
      if (search) {
        const q = search.toLowerCase()
        return variant.recipeName.toLowerCase().includes(q) || variant.variantName.toLowerCase().includes(q)
      }
      return true
    })
  }, [costResults, filterCategory, search])

  // BEP calculation
  const bepResult = useMemo(() => {
    if (!fixedCost || !workingDays || !bepVariantId) return null
    const entry = costResults.find(r => r.variant.variantId === bepVariantId)
    if (!entry || entry.cost.contributionMargin <= 0) return null

    const bep = calculateBEP(
      parseFloat(fixedCost) || 0,
      parseInt(workingDays) || 26,
      entry.cost.contributionMargin,
    )
    return {
      ...bep,
      sellingPrice: entry.cost.sellingPrice,
      bepRevenuePerDay: bep.bepUnitsPerDay * entry.cost.sellingPrice,
      variantName: `${entry.variant.recipeName} (${entry.variant.variantName})`,
      contributionMargin: entry.cost.contributionMargin,
    }
  }, [fixedCost, workingDays, bepVariantId, costResults])

  // Summary stats
  const stats = useMemo(() => {
    const withCost = costResults.filter(r => r.cost.ingredientCost > 0)
    if (withCost.length === 0) return null
    const avgFoodCost = withCost.reduce((s, r) => s + r.cost.foodCostPct, 0) / withCost.length
    const highCost = withCost.filter(r => r.cost.foodCostPct > 35).length
    const negativeMgn = withCost.filter(r => r.cost.contributionMargin < 0).length
    return { totalMenus: costResults.length, withCost: withCost.length, avgFoodCost, highCost, negativeMgn }
  }, [costResults])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
          <Calculator size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ภาพรวมต้นทุนเมนู</h1>
          <p className="text-sm text-base-content/50">วิเคราะห์ต้นทุนและกำไรต่อเมนู</p>
        </div>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">เมนูทั้งหมด</div>
            <div className="stat-value text-xl">{stats.totalMenus}</div>
            <div className="stat-desc">มีข้อมูลต้นทุน {stats.withCost}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Food Cost เฉลี่ย</div>
            <div className={`stat-value text-xl ${stats.avgFoodCost > 35 ? 'text-error' : 'text-success'}`}>
              {formatNumber(stats.avgFoodCost, 1)}%
            </div>
            <div className="stat-desc">จากเมนูที่มีข้อมูล</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Food Cost &gt; 35%</div>
            <div className={`stat-value text-xl ${stats.highCost > 0 ? 'text-warning' : 'text-success'}`}>
              {stats.highCost}
            </div>
            <div className="stat-desc">เมนูที่ควรทบทวน</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-xs">Margin ติดลบ</div>
            <div className={`stat-value text-xl ${stats.negativeMgn > 0 ? 'text-error' : 'text-success'}`}>
              {stats.negativeMgn}
            </div>
            <div className="stat-desc">เมนูขาดทุน</div>
          </div>
        </div>
      )}

      {/* BEP Calculator */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <h2 className="card-title text-base gap-2">
            <Calculator size={18} /> คำนวณจุดคุ้มทุน (BEP)
          </h2>
          <p className="text-xs text-base-content/60 mb-2">
            ระบุต้นทุนคงที่ต่อเดือนและจำนวนวันทำงาน เพื่อคำนวณจำนวนขายขั้นต่ำต่อวัน
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-base-content/60">ต้นทุนคงที่/เดือน (บาท)</label>
              <input
                type="number"
                className="input input-bordered input-sm w-full font-mono"
                placeholder="เช่น 150000"
                value={fixedCost}
                onChange={(e) => setFixedCost(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">วันทำงาน/เดือน</label>
              <input
                type="number"
                className="input input-bordered input-sm w-full font-mono"
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60">เมนูอ้างอิง</label>
              <select
                className="select select-bordered select-sm w-full"
                value={bepVariantId}
                onChange={(e) => setBepVariantId(e.target.value)}
              >
                <option value="">เลือกเมนู...</option>
                {costResults
                  .filter(r => r.cost.contributionMargin > 0)
                  .map(r => (
                    <option key={r.variant.variantId} value={r.variant.variantId}>
                      {r.variant.recipeName} ({r.variant.variantName}) — Margin {formatBaht(r.cost.contributionMargin)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {bepResult && (
            <div className="mt-3 bg-base-300 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-base-content/60 text-xs">ต้นทุนคงที่/วัน</div>
                <div className="font-mono font-semibold">{formatBaht(bepResult.fixedCostPerDay)}</div>
              </div>
              <div>
                <div className="text-base-content/60 text-xs">Contribution Margin</div>
                <div className="font-mono font-semibold">{formatBaht(bepResult.contributionMargin)}</div>
              </div>
              <div>
                <div className="text-base-content/60 text-xs">ขายขั้นต่ำ/วัน</div>
                <div className="font-mono font-semibold text-primary text-lg">
                  {formatNumber(bepResult.bepUnitsPerDay, 0)} ชิ้น
                </div>
              </div>
              <div>
                <div className="text-base-content/60 text-xs">รายได้ขั้นต่ำ/วัน</div>
                <div className="font-mono font-semibold text-primary text-lg">
                  {formatBaht(bepResult.bepRevenuePerDay)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-base-content/60" />
          <select
            className="select select-bordered select-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as RecipeCategory | '')}
          >
            <option value="">ทุกหมวด</option>
            {Object.entries(RECIPE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          className="input input-bordered input-sm flex-1 min-w-40"
          placeholder="ค้นหาเมนู..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-base-content/60">{filtered.length} รายการ</span>
      </div>

      {/* All recipes table */}
      <div className="overflow-x-auto">
        <table className="table table-xs table-zebra">
          <thead>
            <tr>
              <th>เมนู</th>
              <th>ตัวเลือก</th>
              <th className="text-right">ราคาขาย</th>
              <th className="text-right">วัตถุดิบ</th>
              <th className="text-right">บรรจุภัณฑ์</th>
              <th className="text-right">GP</th>
              <th className="text-right">อื่นๆ</th>
              <th className="text-right">ต้นทุนรวม</th>
              <th className="text-right">Margin</th>
              <th className="text-right">Food Cost%</th>
              <th className="text-right">Total Cost%</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center text-base-content/40 py-8">
                  ไม่พบเมนู
                </td>
              </tr>
            )}
            {filtered.map(({ variant, cost }) => (
              <tr key={variant.variantId}>
                <td>
                  <div className="font-medium">{variant.recipeName}</div>
                  <div className="text-xs text-base-content/50">
                    {RECIPE_CATEGORIES[variant.recipeCategory]}
                  </div>
                </td>
                <td>{variant.variantName}</td>
                <td className="text-right font-mono">{formatBaht(cost.sellingPrice)}</td>
                <td className="text-right font-mono">
                  {cost.ingredientCost > 0 ? formatBaht(cost.ingredientCost) : '-'}
                </td>
                <td className="text-right font-mono">
                  {cost.packagingCost > 0 ? formatBaht(cost.packagingCost) : '-'}
                </td>
                <td className="text-right font-mono">
                  {cost.gpPlatformAmount > 0 ? formatBaht(cost.gpPlatformAmount) : '-'}
                </td>
                <td className="text-right font-mono">
                  {cost.otherVariableCost > 0 ? formatBaht(cost.otherVariableCost) : '-'}
                </td>
                <td className="text-right font-mono font-semibold">
                  {cost.totalVariableCost > 0 ? formatBaht(cost.totalVariableCost) : '-'}
                </td>
                <td className={`text-right font-mono ${cost.contributionMargin < 0 ? 'text-error' : ''}`}>
                  {cost.ingredientCost > 0 ? formatBaht(cost.contributionMargin) : '-'}
                </td>
                <td className={`text-right font-mono ${cost.foodCostPct > 35 ? 'text-error' : cost.foodCostPct > 0 ? 'text-success' : ''}`}>
                  {cost.foodCostPct > 0 ? `${formatNumber(cost.foodCostPct, 1)}%` : '-'}
                </td>
                <td className={`text-right font-mono ${cost.totalCostPct > 65 ? 'text-error' : cost.totalCostPct > 50 ? 'text-warning' : cost.totalCostPct > 0 ? 'text-success' : ''}`}>
                  {cost.totalCostPct > 0 ? `${formatNumber(cost.totalCostPct, 1)}%` : '-'}
                </td>
                <td>
                  <Link
                    to={`/app/recipes/${variant.recipeId}`}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="รายละเอียด"
                  >
                    <ExternalLink size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
