import { useState, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useBranch } from '../../../hooks/useBranch'
import { useInventory } from '../hooks/useInventory'
import type { InventoryRow } from '../hooks/useInventory'
import { formatBaht, formatNumber } from '../../../lib/currency'
import { toBuddhistYear } from '../../../lib/date-utils'
import { THAI_MONTHS, INVENTORY_CATEGORIES } from '../../../lib/constants'
import type { InventoryCategory } from '../../../types/database'

const CURRENT_CE_YEAR = new Date().getFullYear()

type TabKey = 'usage_qty' | 'usage_amount' | 'purchase_qty'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'usage_qty', label: 'จำนวนการใช้' },
  { key: 'usage_amount', label: 'ยอดเงินการใช้' },
  { key: 'purchase_qty', label: 'จำนวนการซื้อ' },
]

// Category codes used in reports
const REPORT_CATEGORIES: {
  label: string
  categories: InventoryCategory[]
}[] = [
  {
    label: '0201 วัตถุดิบอาหาร',
    categories: ['0201_dry', '0201_frozen'],
  },
  { label: '0202 วัตถุดิบเครื่องดื่ม', categories: ['0202'] },
  { label: '0203 เครื่องดื่มแอลกอฮอล์', categories: ['0203'] },
  { label: '0204 วัตถุดิบขนมหวาน', categories: ['0204'] },
  { label: '0205 บรรจุภัณฑ์', categories: ['0205'] },
  { label: '0409 วัสดุสิ้นเปลือง', categories: ['0409'] },
]

function getValueForTab(row: InventoryRow, tab: TabKey): number {
  switch (tab) {
    case 'usage_qty':
      return row.uQty
    case 'usage_amount':
      return row.uAmount
    case 'purchase_qty':
      return row.purchasedQty
  }
}

function formatValueForTab(value: number, tab: TabKey): string {
  if (tab === 'usage_amount') return formatBaht(value)
  return formatNumber(value, 2)
}

export default function InventoryReportPage() {
  const { activeBranch } = useBranch()
  const branchId = activeBranch?.id ?? null

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(CURRENT_CE_YEAR)
  const [activeTab, setActiveTab] = useState<TabKey>('usage_qty')

  const { items, loading } = useInventory({ branchId, month, year })

  // Sort items by the active tab value descending
  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => getValueForTab(b, activeTab) - getValueForTab(a, activeTab),
    )
  }, [items, activeTab])

  // Category subtotals
  const categoryTotals = useMemo(() => {
    return REPORT_CATEGORIES.map((rc) => {
      const catItems = items.filter((i) => rc.categories.includes(i.category))
      const total = catItems.reduce(
        (s, i) => s + getValueForTab(i, activeTab),
        0,
      )
      return { ...rc, total, count: catItems.length }
    })
  }, [items, activeTab])

  const grandTotal = useMemo(
    () => items.reduce((s, i) => s + getValueForTab(i, activeTab), 0),
    [items, activeTab],
  )

  const yearOptions = Array.from({ length: 5 }, (_, i) => CURRENT_CE_YEAR - 2 + i)

  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6" />
        รายงาน Inventory
      </h1>

      {/* Month/year selector */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="select select-bordered select-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {THAI_MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="select select-bordered select-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {toBuddhistYear(y)}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            className={`tab ${activeTab === tab.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          ยังไม่มีข้อมูลสำหรับเดือนนี้
        </div>
      ) : (
        <>
          {/* Category subtotals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {categoryTotals.map((ct) => (
              <div
                key={ct.label}
                className="stat bg-base-100 shadow rounded-box p-4"
              >
                <div className="stat-title text-xs">{ct.label}</div>
                <div className="stat-value text-lg">
                  {formatValueForTab(ct.total, activeTab)}
                </div>
                <div className="stat-desc">{ct.count} รายการ</div>
              </div>
            ))}
          </div>

          {/* Grand total */}
          <div className="alert mb-6">
            <span className="font-bold">
              รวมทั้งหมด: {formatValueForTab(grandTotal, activeTab)}
            </span>
          </div>

          {/* Ranking table */}
          <div className="card bg-base-100 shadow">
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra w-full">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>ชื่อ</th>
                    <th>หน่วย</th>
                    <th>หมวด</th>
                    <th className="text-right">
                      {TABS.find((t) => t.key === activeTab)?.label}
                    </th>
                    {activeTab === 'usage_qty' && (
                      <th className="text-right">ยอดเงิน</th>
                    )}
                    {activeTab === 'usage_amount' && (
                      <th className="text-right">จำนวน</th>
                    )}
                    {activeTab === 'purchase_qty' && (
                      <th className="text-right">ต้นทุนเฉลี่ย</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="font-mono text-base-content/50">
                        {idx + 1}
                      </td>
                      <td className="font-medium">{row.name}</td>
                      <td>{row.unit}</td>
                      <td className="text-xs">
                        {INVENTORY_CATEGORIES[row.category]}
                      </td>
                      <td className="text-right font-semibold">
                        {formatValueForTab(
                          getValueForTab(row, activeTab),
                          activeTab,
                        )}
                      </td>
                      {activeTab === 'usage_qty' && (
                        <td className="text-right">
                          {formatBaht(row.uAmount)}
                        </td>
                      )}
                      {activeTab === 'usage_amount' && (
                        <td className="text-right">
                          {formatNumber(row.uQty, 2)}
                        </td>
                      )}
                      {activeTab === 'purchase_qty' && (
                        <td className="text-right">
                          {formatBaht(row.avgCostVal)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
