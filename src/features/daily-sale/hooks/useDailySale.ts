import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'
import type { ChannelSaleEntry, DiscountEntry } from '../utils/sale-calculations'

interface SalesChannel {
  id: string
  code: string
  name: string
  type: 'dine_in' | 'delivery'
  commission_pct: number
  sort_order: number
}

interface SalesTarget {
  date: string
  target_amount: number
}


export function useDailySale(branchId: string | null, date: string) {
  const { profile } = useAuth()
  const [channels, setChannels] = useState<SalesChannel[]>([])
  const [entries, setEntries] = useState<ChannelSaleEntry[]>([])
  const [discounts, setDiscounts] = useState<DiscountEntry[]>([
    { code: '0111', amount: 0 },
    { code: '0112', amount: 0 },
    { code: '0113', amount: 0 },
  ])
  const [vat, setVat] = useState(0)
  const [cashOverShort, setCashOverShort] = useState(0)
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [monthSales, setMonthSales] = useState<{ date: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const effectiveBranchId = branchId || profile?.branch_id

  const fetchChannels = useCallback(async () => {
    if (!profile?.tenant_id) return
    const { data } = await supabase
      .from('sales_channels')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('sort_order')
    if (data) setChannels(data)
  }, [profile?.tenant_id])

  const fetchDailySale = useCallback(async () => {
    if (!effectiveBranchId || !date) return
    setLoading(true)

    try {
      // ดึงข้อมูลยอดขายรายวัน
      const { data: salesData } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('branch_id', effectiveBranchId)
        .eq('date', date)

      // ดึงส่วนลด
      const { data: discountData } = await supabase
        .from('daily_sale_discounts')
        .select('*')
        .eq('branch_id', effectiveBranchId)
        .eq('date', date)

      // ดึง VAT + Cash over/short
      const { data: extrasData } = await supabase
        .from('daily_sale_extras')
        .select('*')
        .eq('branch_id', effectiveBranchId)
        .eq('date', date)

      if (salesData && salesData.length > 0) {
        setEntries(
          salesData.map((s) => ({
            channelId: s.channel_id,
            amount: s.amount,
            bills: s.bills,
            heads: s.heads,
            gpCommission: s.gp_commission,
          })),
        )
      }

      if (discountData && discountData.length > 0) {
        setDiscounts([
          { code: '0111', amount: discountData.find((d) => d.code === '0111')?.amount || 0 },
          { code: '0112', amount: discountData.find((d) => d.code === '0112')?.amount || 0 },
          { code: '0113', amount: discountData.find((d) => d.code === '0113')?.amount || 0 },
        ])
      }

      if (extrasData) {
        const vatEntry = extrasData.find((e) => e.code === '0114')
        const cashEntry = extrasData.find((e) => e.code === '0115')
        if (vatEntry) setVat(vatEntry.amount)
        if (cashEntry) setCashOverShort(cashEntry.amount)
      }

      // ดึงเป้าเดือน
      const dateObj = new Date(date)
      const monthStart = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`
      const monthEnd = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-31`

      const { data: targetData } = await supabase
        .from('sales_targets')
        .select('date, target_amount')
        .eq('branch_id', effectiveBranchId)
        .gte('date', monthStart)
        .lte('date', monthEnd)

      if (targetData) setTargets(targetData)

      // ดึงยอดขายทั้งเดือน (สำหรับ DTD)
      const { data: monthSalesData } = await supabase
        .from('daily_sales')
        .select('date, amount')
        .eq('branch_id', effectiveBranchId)
        .gte('date', monthStart)
        .lte('date', monthEnd)

      if (monthSalesData) {
        // aggregate per date
        const byDate = new Map<string, number>()
        for (const s of monthSalesData) {
          byDate.set(s.date, (byDate.get(s.date) || 0) + s.amount)
        }
        setMonthSales(Array.from(byDate.entries()).map(([d, a]) => ({ date: d, amount: a })))
      }
    } finally {
      setLoading(false)
    }
  }, [effectiveBranchId, date])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  useEffect(() => {
    if (channels.length > 0) {
      fetchDailySale()
    }
  }, [fetchDailySale, channels.length])

  // Initialize entries when channels load and no saved data
  useEffect(() => {
    if (channels.length > 0 && entries.length === 0) {
      setEntries(
        channels.map((ch) => ({
          channelId: ch.id,
          amount: 0,
          bills: 0,
          heads: 0,
          gpCommission: 0,
        })),
      )
    }
  }, [channels, entries.length])

  const save = useCallback(async () => {
    if (!effectiveBranchId || !profile?.id) return
    setSaving(true)

    try {
      // Delete existing records for this date
      await supabase.from('daily_sales').delete().eq('branch_id', effectiveBranchId).eq('date', date)
      await supabase.from('daily_sale_discounts').delete().eq('branch_id', effectiveBranchId).eq('date', date)
      await supabase.from('daily_sale_extras').delete().eq('branch_id', effectiveBranchId).eq('date', date)

      // Insert sales entries
      const saleRows = entries
        .filter((e) => e.amount > 0 || e.bills > 0)
        .map((e) => ({
          branch_id: effectiveBranchId,
          date,
          channel_id: e.channelId,
          amount: e.amount,
          bills: e.bills,
          heads: e.heads,
          gp_commission: e.gpCommission,
          created_by: profile.id,
        }))

      if (saleRows.length > 0) {
        const { error } = await supabase.from('daily_sales').insert(saleRows)
        if (error) throw error
      }

      // Insert discounts
      const discountRows = discounts
        .filter((d) => d.amount !== 0)
        .map((d) => ({
          branch_id: effectiveBranchId,
          date,
          code: d.code,
          amount: d.amount,
        }))

      if (discountRows.length > 0) {
        const { error } = await supabase.from('daily_sale_discounts').insert(discountRows)
        if (error) throw error
      }

      // Insert extras (VAT, Cash over/short)
      const extraRows = [
        { branch_id: effectiveBranchId, date, code: '0114', amount: vat },
        { branch_id: effectiveBranchId, date, code: '0115', amount: cashOverShort },
      ].filter((e) => e.amount !== 0)

      if (extraRows.length > 0) {
        const { error } = await supabase.from('daily_sale_extras').insert(extraRows)
        if (error) throw error
      }

      showSuccess('บันทึกยอดขายสำเร็จ')
      await fetchDailySale()
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการบันทึก')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [effectiveBranchId, profile?.id, date, entries, discounts, vat, cashOverShort, fetchDailySale])

  return {
    channels,
    entries,
    setEntries,
    discounts,
    setDiscounts,
    vat,
    setVat,
    cashOverShort,
    setCashOverShort,
    targets,
    monthSales,
    loading,
    saving,
    save,
  }
}
