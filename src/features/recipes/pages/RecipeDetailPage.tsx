import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Copy, Save, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useRecipeDetail } from '../hooks/useRecipeDetail'
import { useAuth } from '../../../hooks/useAuth'
import { RECIPE_CATEGORIES, INVENTORY_CATEGORIES } from '../../../lib/constants'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { calculateVariantCost } from '../utils/recipe-calculations'
import type { RecipeCategory } from '../../../types/database'
import type { VariantDetail } from '../hooks/useRecipeDetail'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'

  const {
    recipe, inventoryItems, avgCosts, loading, saving,
    updateRecipe, addVariant, updateVariant, deleteVariant,
    addIngredient, updateIngredient, removeIngredient, copyIngredients,
  } = useRecipeDetail(id ?? null)

  // Local state for editing
  const [editName, setEditName] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState<RecipeCategory | null>(null)

  // Add variant modal
  const [showAddVariant, setShowAddVariant] = useState(false)
  const [variantName, setVariantName] = useState('')
  const [variantPrice, setVariantPrice] = useState('')

  // Expanded variant panels
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null)

  // Add ingredient state (per variant)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newItemId, setNewItemId] = useState('')
  const [newQty, setNewQty] = useState('')

  // Copy from modal
  const [copyTo, setCopyTo] = useState<string | null>(null)
  const [copyFrom, setCopyFrom] = useState('')

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/50 mb-4">ไม่พบสูตรอาหาร</p>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/recipes')}>
          <ArrowLeft size={16} /> กลับ
        </button>
      </div>
    )
  }

  const handleSaveName = async () => {
    if (editName !== null && editName.trim()) {
      await updateRecipe({ name: editName.trim() })
      setEditName(null)
    }
  }

  const handleAddVariant = async () => {
    if (!variantName.trim()) return
    await addVariant(variantName.trim(), parseFloat(variantPrice) || 0)
    setShowAddVariant(false)
    setVariantName('')
    setVariantPrice('')
  }

  const handleAddIngredient = async (variantId: string) => {
    if (!newItemId || !newQty) return
    await addIngredient(variantId, newItemId, parseFloat(newQty) || 0)
    setAddingTo(null)
    setNewItemId('')
    setNewQty('')
  }

  const handleCopy = async (toVariantId: string) => {
    if (!copyFrom) return
    await copyIngredients(copyFrom, toVariantId)
    setCopyTo(null)
    setCopyFrom('')
  }

  const handleUpdateCostField = (
    variant: VariantDetail,
    field: 'packaging_cost' | 'gp_platform_pct' | 'other_variable_cost',
    rawValue: string,
  ) => {
    let val = parseFloat(rawValue) || 0
    // gp_platform_pct: user enters percentage (e.g. 16), store as decimal (0.16)
    const storeVal = field === 'gp_platform_pct' ? val / 100 : val
    const currentVal = variant[field]
    if (storeVal !== currentVal) {
      updateVariant(variant.id, { [field]: storeVal } as any)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost btn-sm btn-circle" onClick={() => navigate('/app/recipes')}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          {editName !== null ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input input-bordered input-sm flex-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={saving}>
                <Save size={14} />
              </button>
            </div>
          ) : (
            <h1
              className={`text-2xl font-bold ${isOwner ? 'cursor-pointer hover:text-primary' : ''}`}
              onClick={() => isOwner && setEditName(recipe.name)}
            >
              {recipe.name}
            </h1>
          )}

          <div className="flex items-center gap-2 mt-1">
            {isOwner ? (
              <select
                className="select select-ghost select-xs"
                value={editCategory ?? recipe.category}
                onChange={async (e) => {
                  const val = e.target.value as RecipeCategory
                  setEditCategory(val)
                  await updateRecipe({ category: val })
                  setEditCategory(null)
                }}
              >
                {Object.entries(RECIPE_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <span className="badge badge-ghost badge-sm">{RECIPE_CATEGORIES[recipe.category]}</span>
            )}
            <span className={`badge badge-xs ${recipe.is_active ? 'badge-success' : 'badge-error'}`}>
              {recipe.is_active ? 'เปิด' : 'ปิด'}
            </span>
          </div>
        </div>
      </div>

      {/* Variants Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ตัวเลือก ({recipe.variants.length})</h2>
        {isOwner && (
          <button
            className="btn btn-outline btn-sm gap-1"
            onClick={() => setShowAddVariant(true)}
          >
            <Plus size={14} /> เพิ่มตัวเลือก
          </button>
        )}
      </div>

      {/* Variant Cards */}
      <div className="space-y-3">
        {recipe.variants.map((variant) => {
          const isExpanded = expandedVariant === variant.id
          const costResult = calculateVariantCost(
            variant.ingredients.map(i => ({
              itemId: i.item_id, itemName: i.item_name, unit: i.unit, quantity: i.quantity,
            })),
            avgCosts,
            variant.selling_price,
            variant.packaging_cost,
            variant.gp_platform_pct,
            variant.other_variable_cost,
          )
          const hasExtraCosts = variant.packaging_cost > 0 || variant.gp_platform_pct > 0 || variant.other_variable_cost > 0

          return (
            <div key={variant.id} className="card bg-base-200 shadow-sm">
              {/* Variant Header */}
              <div
                className="card-body p-4 cursor-pointer"
                onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <div>
                      <span className="font-semibold">{variant.name}</span>
                      {variant.is_default && (
                        <span className="badge badge-primary badge-xs ml-2">ค่าเริ่มต้น</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="text-right">
                      <div className="text-base-content/60">ราคาขาย</div>
                      <div className="font-mono font-semibold">{formatBaht(variant.selling_price)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base-content/60">วัตถุดิบ</div>
                      <div className="font-mono">{variant.ingredients.length} รายการ</div>
                    </div>
                    {costResult.ingredientCost > 0 && (
                      <>
                        <div className="text-right">
                          <div className="text-base-content/60">ต้นทุนวัตถุดิบ</div>
                          <div className="font-mono">{formatBaht(costResult.ingredientCost)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base-content/60">Food Cost</div>
                          <div className={`font-mono ${costResult.foodCostPct > 35 ? 'text-error' : 'text-success'}`}>
                            {formatNumber(costResult.foodCostPct, 1)}%
                          </div>
                        </div>
                        {hasExtraCosts && (
                          <>
                            <div className="text-right">
                              <div className="text-base-content/60">ต้นทุนรวม</div>
                              <div className="font-mono">{formatBaht(costResult.totalVariableCost)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-base-content/60">Margin</div>
                              <div className={`font-mono ${costResult.contributionMargin < 0 ? 'text-error' : 'text-success'}`}>
                                {formatBaht(costResult.contributionMargin)}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded: Details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Variant price + cost fields editor */}
                  {isOwner && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <label className="text-base-content/60 text-xs">ราคาขาย (บาท)</label>
                        <input
                          type="number"
                          className="input input-bordered input-xs w-full font-mono"
                          defaultValue={variant.selling_price}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            if (val !== variant.selling_price) {
                              updateVariant(variant.id, { selling_price: val })
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-base-content/60 text-xs">บรรจุภัณฑ์ (บาท/ชิ้น)</label>
                        <input
                          type="number"
                          className="input input-bordered input-xs w-full font-mono"
                          defaultValue={variant.packaging_cost}
                          step="0.01"
                          onBlur={(e) => handleUpdateCostField(variant, 'packaging_cost', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-base-content/60 text-xs">GP Platform (%)</label>
                        <input
                          type="number"
                          className="input input-bordered input-xs w-full font-mono"
                          defaultValue={formatNumber(variant.gp_platform_pct * 100, 2)}
                          step="0.01"
                          placeholder="เช่น 16"
                          onBlur={(e) => handleUpdateCostField(variant, 'gp_platform_pct', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-base-content/60 text-xs">ต้นทุนอื่น (บาท/ชิ้น)</label>
                        <input
                          type="number"
                          className="input input-bordered input-xs w-full font-mono"
                          defaultValue={variant.other_variable_cost}
                          step="0.01"
                          onBlur={(e) => handleUpdateCostField(variant, 'other_variable_cost', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Cost breakdown summary */}
                  {costResult.ingredientCost > 0 && (
                    <div className="bg-base-300 rounded-lg p-3 text-sm">
                      <div className="font-semibold mb-2">สรุปต้นทุน</div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div className="flex justify-between">
                          <span className="text-base-content/70">ต้นทุนวัตถุดิบ</span>
                          <span className="font-mono">{formatBaht(costResult.ingredientCost)}</span>
                        </div>
                        {costResult.packagingCost > 0 && (
                          <div className="flex justify-between">
                            <span className="text-base-content/70">บรรจุภัณฑ์</span>
                            <span className="font-mono">{formatBaht(costResult.packagingCost)}</span>
                          </div>
                        )}
                        {costResult.gpPlatformAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-base-content/70">GP Platform</span>
                            <span className="font-mono">{formatBaht(costResult.gpPlatformAmount)}</span>
                          </div>
                        )}
                        {costResult.otherVariableCost > 0 && (
                          <div className="flex justify-between">
                            <span className="text-base-content/70">ต้นทุนอื่น</span>
                            <span className="font-mono">{formatBaht(costResult.otherVariableCost)}</span>
                          </div>
                        )}
                        <div className="col-span-2 border-t border-base-content/10 mt-1 pt-1 flex justify-between font-semibold">
                          <span>ต้นทุนผันแปรรวม</span>
                          <span className="font-mono">{formatBaht(costResult.totalVariableCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Contribution Margin</span>
                          <span className={`font-mono ${costResult.contributionMargin < 0 ? 'text-error' : 'text-success'}`}>
                            {formatBaht(costResult.contributionMargin)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Food Cost %</span>
                          <span className={`font-mono ${costResult.foodCostPct > 35 ? 'text-error' : 'text-success'}`}>
                            {formatNumber(costResult.foodCostPct, 1)}%
                          </span>
                        </div>
                        {hasExtraCosts && (
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Total Cost %</span>
                            <span className={`font-mono ${costResult.totalCostPct > 65 ? 'text-error' : costResult.totalCostPct > 50 ? 'text-warning' : 'text-success'}`}>
                              {formatNumber(costResult.totalCostPct, 1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delete variant (only non-default) */}
                  {isOwner && !variant.is_default && (
                    <div className="flex justify-end">
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => {
                          if (confirm(`ลบตัวเลือก "${variant.name}" ?`)) deleteVariant(variant.id)
                        }}
                      >
                        <Trash2 size={14} /> ลบตัวเลือก
                      </button>
                    </div>
                  )}

                  {/* Ingredients table */}
                  {variant.ingredients.length > 0 && (
                    <table className="table table-xs">
                      <thead>
                        <tr>
                          <th>วัตถุดิบ</th>
                          <th className="text-right w-28">ปริมาณ</th>
                          <th className="w-20">หน่วย</th>
                          <th className="text-right w-24">ต้นทุน/หน่วย</th>
                          <th className="text-right w-24">ต้นทุนรวม</th>
                          {isOwner && <th className="w-16"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {costResult.ingredients.map((ing, idx) => (
                          <tr key={variant.ingredients[idx].id}>
                            <td>{ing.itemName}</td>
                            <td className="text-right">
                              {isOwner ? (
                                <input
                                  type="number"
                                  className="input input-bordered input-xs w-24 text-right font-mono"
                                  defaultValue={ing.quantity}
                                  step="0.01"
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    if (val !== ing.quantity) updateIngredient(variant.ingredients[idx].id, val)
                                  }}
                                />
                              ) : (
                                <span className="font-mono">{formatNumber(ing.quantity, 2)}</span>
                              )}
                            </td>
                            <td className="text-base-content/60">{ing.unit}</td>
                            <td className="text-right font-mono text-base-content/60">
                              {ing.avgCost > 0 ? formatBaht(ing.avgCost) : '-'}
                            </td>
                            <td className="text-right font-mono">
                              {ing.totalCost > 0 ? formatBaht(ing.totalCost) : '-'}
                            </td>
                            {isOwner && (
                              <td>
                                <button
                                  className="btn btn-ghost btn-xs text-error"
                                  onClick={() => removeIngredient(variant.ingredients[idx].id)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td colSpan={4} className="text-right">รวมวัตถุดิบ</td>
                          <td className="text-right font-mono">{formatBaht(costResult.ingredientCost)}</td>
                          {isOwner && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {variant.ingredients.length === 0 && (
                    <p className="text-sm text-base-content/40 text-center py-2">
                      ยังไม่มีวัตถุดิบ
                    </p>
                  )}

                  {/* Actions */}
                  {isOwner && (
                    <div className="flex flex-wrap gap-2">
                      {addingTo === variant.id ? (
                        <div className="flex items-center gap-2 flex-wrap w-full">
                          <select
                            className="select select-bordered select-xs flex-1 min-w-40"
                            value={newItemId}
                            onChange={(e) => setNewItemId(e.target.value)}
                          >
                            <option value="">เลือกวัตถุดิบ...</option>
                            {Object.entries(INVENTORY_CATEGORIES).map(([catKey, catLabel]) => {
                              const items = inventoryItems.filter(i => i.category === catKey)
                              if (items.length === 0) return null
                              return (
                                <optgroup key={catKey} label={catLabel}>
                                  {items.map(item => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} ({item.unit})
                                    </option>
                                  ))}
                                </optgroup>
                              )
                            })}
                          </select>
                          <input
                            type="number"
                            className="input input-bordered input-xs w-24"
                            placeholder="ปริมาณ"
                            step="0.01"
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value)}
                          />
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleAddIngredient(variant.id)}
                            disabled={!newItemId || !newQty || saving}
                          >
                            เพิ่ม
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => { setAddingTo(null); setNewItemId(''); setNewQty('') }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="btn btn-outline btn-xs gap-1"
                            onClick={() => setAddingTo(variant.id)}
                          >
                            <Plus size={12} /> เพิ่มวัตถุดิบ
                          </button>

                          {recipe.variants.length > 1 && (
                            copyTo === variant.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  className="select select-bordered select-xs"
                                  value={copyFrom}
                                  onChange={(e) => setCopyFrom(e.target.value)}
                                >
                                  <option value="">คัดลอกจาก...</option>
                                  {recipe.variants
                                    .filter(v => v.id !== variant.id && v.ingredients.length > 0)
                                    .map(v => (
                                      <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                                <button
                                  className="btn btn-primary btn-xs"
                                  onClick={() => handleCopy(variant.id)}
                                  disabled={!copyFrom || saving}
                                >
                                  คัดลอก
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => { setCopyTo(null); setCopyFrom('') }}
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-ghost btn-xs gap-1"
                                onClick={() => setCopyTo(variant.id)}
                              >
                                <Copy size={12} /> คัดลอกจากตัวเลือกอื่น
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Variant Modal */}
      {showAddVariant && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">เพิ่มตัวเลือก</h3>
            <p className="text-sm text-base-content/60 mb-4">
              เช่น "พิเศษ" สำหรับจานที่ใส่วัตถุดิบมากขึ้น หรือ "ไซส์ L" สำหรับเครื่องดื่ม
            </p>

            <div className="form-control gap-3">
              <div>
                <label className="label label-text">ชื่อตัวเลือก</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="เช่น พิเศษ, ไซส์ L"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label label-text">ราคาขาย</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder="0.00"
                  value={variantPrice}
                  onChange={(e) => setVariantPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowAddVariant(false)}>ยกเลิก</button>
              <button
                className="btn btn-primary"
                onClick={handleAddVariant}
                disabled={!variantName.trim() || saving}
              >
                เพิ่ม
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowAddVariant(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  )
}
