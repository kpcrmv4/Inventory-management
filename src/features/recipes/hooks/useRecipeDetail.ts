import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'
import type { RecipeCategory } from '../../../types/database'

export interface VariantDetail {
  id: string
  name: string
  selling_price: number
  is_default: boolean
  sort_order: number
  ingredients: IngredientDetail[]
}

export interface IngredientDetail {
  id: string
  item_id: string
  item_name: string
  unit: string
  quantity: number
}

export interface RecipeDetail {
  id: string
  name: string
  category: RecipeCategory
  is_active: boolean
  variants: VariantDetail[]
}

export interface InventoryOption {
  id: string
  name: string
  unit: string
  category: string
}

export function useRecipeDetail(recipeId: string | null) {
  const { profile } = useAuth()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!recipeId || !profile?.tenant_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id, name, category, is_active,
          recipe_variants (
            id, name, selling_price, is_default, sort_order,
            recipe_ingredients (
              id, item_id, quantity,
              inventory_items ( name, unit )
            )
          )
        `)
        .eq('id', recipeId)
        .single()

      if (error) throw error

      const mapped: RecipeDetail = {
        id: data.id,
        name: data.name,
        category: data.category,
        is_active: data.is_active,
        variants: (data.recipe_variants ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((v: any) => ({
            id: v.id,
            name: v.name,
            selling_price: v.selling_price,
            is_default: v.is_default,
            sort_order: v.sort_order,
            ingredients: (v.recipe_ingredients ?? []).map((ri: any) => ({
              id: ri.id,
              item_id: ri.item_id,
              item_name: ri.inventory_items?.name ?? '',
              unit: ri.inventory_items?.unit ?? '',
              quantity: ri.quantity,
            })),
          })),
      }

      setRecipe(mapped)
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถโหลดข้อมูลสูตรอาหารได้')
    } finally {
      setLoading(false)
    }
  }, [recipeId, profile?.tenant_id])

  // Fetch inventory items for dropdown
  const fetchInventoryItems = useCallback(async () => {
    if (!profile?.tenant_id) return

    // Get all active items across all branches in the tenant
    const { data } = await supabase
      .from('inventory_items')
      .select('id, name, unit, category')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('category')
      .order('name')

    if (data) {
      // Deduplicate by name+unit (same item might exist in multiple branches)
      const seen = new Map<string, InventoryOption>()
      for (const item of data) {
        const key = `${item.name}|${item.unit}`
        if (!seen.has(key)) {
          seen.set(key, { id: item.id, name: item.name, unit: item.unit, category: item.category })
        }
      }
      setInventoryItems(Array.from(seen.values()))
    }
  }, [profile?.tenant_id])

  useEffect(() => {
    fetchDetail()
    fetchInventoryItems()
  }, [fetchDetail, fetchInventoryItems])

  // Update recipe metadata
  const updateRecipe = useCallback(async (updates: { name?: string; category?: RecipeCategory }) => {
    if (!recipeId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', recipeId)
      if (error) throw error
      showSuccess('บันทึกสำเร็จ')
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถบันทึกได้')
    } finally {
      setSaving(false)
    }
  }, [recipeId, fetchDetail])

  // Add variant
  const addVariant = useCallback(async (name: string, sellingPrice: number) => {
    if (!recipeId) return
    setSaving(true)
    try {
      const maxSort = recipe?.variants.reduce((m, v) => Math.max(m, v.sort_order), 0) ?? 0
      const { error } = await supabase
        .from('recipe_variants')
        .insert({
          recipe_id: recipeId,
          name,
          selling_price: sellingPrice,
          is_default: false,
          sort_order: maxSort + 1,
        })
      if (error) throw error
      showSuccess(`เพิ่มตัวเลือก "${name}" สำเร็จ`)
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถเพิ่มตัวเลือกได้')
    } finally {
      setSaving(false)
    }
  }, [recipeId, recipe, fetchDetail])

  // Update variant
  const updateVariant = useCallback(async (variantId: string, updates: { name?: string; selling_price?: number }) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('recipe_variants')
        .update(updates)
        .eq('id', variantId)
      if (error) throw error
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถแก้ไขตัวเลือกได้')
    } finally {
      setSaving(false)
    }
  }, [fetchDetail])

  // Delete variant
  const deleteVariant = useCallback(async (variantId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('recipe_variants')
        .delete()
        .eq('id', variantId)
      if (error) throw error
      showSuccess('ลบตัวเลือกสำเร็จ')
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถลบตัวเลือกได้')
    } finally {
      setSaving(false)
    }
  }, [fetchDetail])

  // Add ingredient to variant
  const addIngredient = useCallback(async (variantId: string, itemId: string, quantity: number) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .upsert(
          { variant_id: variantId, item_id: itemId, quantity },
          { onConflict: 'variant_id,item_id' },
        )
      if (error) throw error
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถเพิ่มวัตถุดิบได้')
    } finally {
      setSaving(false)
    }
  }, [fetchDetail])

  // Update ingredient quantity
  const updateIngredient = useCallback(async (ingredientId: string, quantity: number) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .update({ quantity })
        .eq('id', ingredientId)
      if (error) throw error
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถแก้ไขปริมาณได้')
    } finally {
      setSaving(false)
    }
  }, [fetchDetail])

  // Remove ingredient
  const removeIngredient = useCallback(async (ingredientId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', ingredientId)
      if (error) throw error
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถลบวัตถุดิบได้')
    } finally {
      setSaving(false)
    }
  }, [fetchDetail])

  // Copy ingredients from one variant to another
  const copyIngredients = useCallback(async (fromVariantId: string, toVariantId: string) => {
    const source = recipe?.variants.find(v => v.id === fromVariantId)
    if (!source || source.ingredients.length === 0) return

    setSaving(true)
    try {
      const rows = source.ingredients.map(ing => ({
        variant_id: toVariantId,
        item_id: ing.item_id,
        quantity: ing.quantity,
      }))

      const { error } = await supabase
        .from('recipe_ingredients')
        .upsert(rows, { onConflict: 'variant_id,item_id' })

      if (error) throw error
      showSuccess('คัดลอกวัตถุดิบสำเร็จ')
      await fetchDetail()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถคัดลอกวัตถุดิบได้')
    } finally {
      setSaving(false)
    }
  }, [recipe, fetchDetail])

  return {
    recipe,
    inventoryItems,
    loading,
    saving,
    updateRecipe,
    addVariant,
    updateVariant,
    deleteVariant,
    addIngredient,
    updateIngredient,
    removeIngredient,
    copyIngredients,
    refetch: fetchDetail,
  }
}
