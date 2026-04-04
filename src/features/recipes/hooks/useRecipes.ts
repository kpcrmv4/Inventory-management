import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'
import type { RecipeCategory } from '../../../types/database'

export interface RecipeListItem {
  id: string
  name: string
  category: RecipeCategory
  is_active: boolean
  sort_order: number
  variants: {
    id: string
    name: string
    selling_price: number
    is_default: boolean
    ingredient_count: number
  }[]
}

export function useRecipes() {
  const { profile } = useAuth()
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecipes = useCallback(async () => {
    if (!profile?.tenant_id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id, name, category, is_active, sort_order,
          recipe_variants (
            id, name, selling_price, is_default, sort_order,
            recipe_ingredients ( id )
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('sort_order')
        .order('name')

      if (error) throw error

      const mapped: RecipeListItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        is_active: r.is_active,
        sort_order: r.sort_order,
        variants: (r.recipe_variants ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((v: any) => ({
            id: v.id,
            name: v.name,
            selling_price: v.selling_price,
            is_default: v.is_default,
            ingredient_count: v.recipe_ingredients?.length ?? 0,
          })),
      }))

      setRecipes(mapped)
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถโหลดรายการสูตรอาหารได้')
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  const createRecipe = useCallback(async (
    name: string,
    category: RecipeCategory,
    defaultPrice: number,
  ) => {
    if (!profile?.tenant_id) return null

    try {
      // Create recipe
      const { data: recipe, error: recipeErr } = await supabase
        .from('recipes')
        .insert({ tenant_id: profile.tenant_id, name, category })
        .select('id')
        .single()

      if (recipeErr) throw recipeErr

      // Create default variant
      const { error: variantErr } = await supabase
        .from('recipe_variants')
        .insert({
          recipe_id: recipe.id,
          name: 'ปกติ',
          selling_price: defaultPrice,
          is_default: true,
        })

      if (variantErr) throw variantErr

      showSuccess('สร้างสูตรอาหารสำเร็จ')
      await fetchRecipes()
      return recipe.id
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถสร้างสูตรอาหารได้')
      return null
    }
  }, [profile?.tenant_id, fetchRecipes])

  const deleteRecipe = useCallback(async (recipeId: string) => {
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
      if (error) throw error
      showSuccess('ลบสูตรอาหารสำเร็จ')
      await fetchRecipes()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถลบสูตรอาหารได้')
    }
  }, [fetchRecipes])

  const toggleActive = useCallback(async (recipeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ is_active: !isActive })
        .eq('id', recipeId)
      if (error) throw error
      await fetchRecipes()
    } catch (err) {
      console.error(err)
      showError('ไม่สามารถเปลี่ยนสถานะได้')
    }
  }, [fetchRecipes])

  return { recipes, loading, createRecipe, deleteRecipe, toggleActive, refetch: fetchRecipes }
}
