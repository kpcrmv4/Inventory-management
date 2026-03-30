import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { InventoryCategory } from '../../../types/database'
import {
  usageQty,
  usageAmount,
  avgDailyUsage,
  closingAmountCalc,
  totalPurchasedQty,
  avgCostFromPurchase,
  avgCostFallback,
  avgCost,
  usagePer10000,
  usagePer1000,
} from '../utils/calculations'

export interface InventoryItem {
  id: string
  name: string
  unit: string
  category: InventoryCategory
}

export interface InventoryRow extends InventoryItem {
  openingQty: number
  openingAmount: number
  totalReceivedQty: number
  totalReceivedAmount: number
  closingUnitPrice: number
  closingQty: number
  // computed
  closingAmount: number
  uQty: number
  uAmount: number
  avgDaily: number
  purchasedQty: number
  costFromPurchase: number
  costFallback: number
  avgCostVal: number
  per10000: number
  per1000: number
}

export interface MonthlyHeader {
  totalMonthlySales: number
  sellingDays: number
}

interface UseInventoryOpts {
  branchId: string | null
  month: number // 1-12
  year: number  // CE year
}

export function useInventory({ branchId, month, year }: UseInventoryOpts) {
  const [items, setItems] = useState<InventoryRow[]>([])
  const [header, setHeader] = useState<MonthlyHeader>({
    totalMonthlySales: 0,
    sellingDays: 0,
  })
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!branchId) return
    setLoading(true)

    try {
      // Fetch inventory items
      const { data: rawItems } = await supabase
        .from('inventory_items')
        .select('id, name, unit, category')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('category')
        .order('name')

      if (!rawItems || rawItems.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      const itemIds = rawItems.map((i) => i.id)

      // Fetch opening, closing, receiving in parallel
      const [openingRes, closingRes, receivingRes, headerRes] =
        await Promise.all([
          supabase
            .from('opening_stock')
            .select('item_id, quantity, amount')
            .eq('branch_id', branchId)
            .eq('month', month)
            .eq('year', year)
            .in('item_id', itemIds),
          supabase
            .from('closing_stock')
            .select('item_id, unit_price, quantity')
            .eq('branch_id', branchId)
            .eq('month', month)
            .eq('year', year)
            .in('item_id', itemIds),
          supabase
            .from('daily_receiving')
            .select('item_id, qty, amount')
            .eq('branch_id', branchId)
            .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
            .lte(
              'date',
              `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
            )
            .in('item_id', itemIds),
          supabase
            .from('monthly_inventory_header')
            .select('total_monthly_sales, selling_days')
            .eq('branch_id', branchId)
            .eq('month', month)
            .eq('year', year)
            .maybeSingle(),
        ])

      // Build lookup maps
      const openingMap = new Map<string, { qty: number; amount: number }>()
      for (const o of openingRes.data ?? []) {
        openingMap.set(o.item_id, { qty: o.quantity, amount: o.amount })
      }

      const closingMap = new Map<
        string,
        { unitPrice: number; qty: number }
      >()
      for (const c of closingRes.data ?? []) {
        closingMap.set(c.item_id, { unitPrice: c.unit_price, qty: c.quantity })
      }

      // Aggregate receiving
      const recvMap = new Map<string, { qty: number; amount: number }>()
      for (const r of receivingRes.data ?? []) {
        const cur = recvMap.get(r.item_id) ?? { qty: 0, amount: 0 }
        cur.qty += r.qty
        cur.amount += r.amount
        recvMap.set(r.item_id, cur)
      }

      const hdr = headerRes.data
      const totalSales = hdr?.total_monthly_sales ?? 0
      const sellDays = hdr?.selling_days ?? 0
      setHeader({ totalMonthlySales: totalSales, sellingDays: sellDays })

      // Compute rows
      const rows: InventoryRow[] = rawItems.map((item) => {
        const opening = openingMap.get(item.id) ?? { qty: 0, amount: 0 }
        const closing = closingMap.get(item.id) ?? { unitPrice: 0, qty: 0 }
        const recv = recvMap.get(item.id) ?? { qty: 0, amount: 0 }

        const cAmount = closingAmountCalc(closing.unitPrice, closing.qty)
        const uQty = usageQty(opening.qty, recv.qty, closing.qty)
        const uAmount = usageAmount(opening.amount, recv.amount, cAmount)
        const avgDaily = avgDailyUsage(uQty, sellDays)
        const purchased = totalPurchasedQty(uQty, opening.qty, closing.qty)
        const costPurchase = avgCostFromPurchase(
          uAmount,
          opening.amount,
          cAmount,
          purchased,
        )
        const costFb = avgCostFallback(opening.amount, opening.qty)
        const avg = avgCost(costPurchase, costFb)
        const p10k = usagePer10000(uQty, totalSales)
        const p1k = usagePer1000(uQty, totalSales)

        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category as InventoryCategory,
          openingQty: opening.qty,
          openingAmount: opening.amount,
          totalReceivedQty: recv.qty,
          totalReceivedAmount: recv.amount,
          closingUnitPrice: closing.unitPrice,
          closingQty: closing.qty,
          closingAmount: cAmount,
          uQty,
          uAmount,
          avgDaily,
          purchasedQty: purchased,
          costFromPurchase: costPurchase,
          costFallback: costFb,
          avgCostVal: avg,
          per10000: p10k,
          per1000: p1k,
        }
      })

      setItems(rows)
    } catch {
      // handled by caller
    } finally {
      setLoading(false)
    }
  }, [branchId, month, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { items, header, loading, refetch: fetchData }
}
