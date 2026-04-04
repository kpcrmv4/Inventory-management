import { useState } from 'react'
import { FileText, Printer } from 'lucide-react'
import { usePLReport } from '../hooks/usePLReport'
import { useBranch } from '../../../hooks/useBranch'
import { PL_CODES, THAI_MONTHS } from '../../../lib/constants'
import { formatBaht, formatPercent } from '../../../lib/currency'
import { toBuddhistYear } from '../../../lib/date-utils'
import { calculatePercentages } from '../utils/pl-calculations'

type PLCode = keyof typeof PL_CODES

export default function PLReportPage() {
  const { activeBranch } = useBranch()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { report, loading } = usePLReport({
    branchId: activeBranch?.id ?? null,
    month,
    year,
  })

  // Percentage helper
  const pct = (amount: number) => {
    if (!report) return { pctBeforeDiscount: 0, pctAfterDiscount: 0 }
    return calculatePercentages(amount, report.revenue.grossRevenue, report.revenue.netRevenue)
  }

  // Row renderer
  function PLRow({
    code,
    label,
    amount,
    isHighlight = false,
    isBold = false,
    isReadOnly = false,
    isNegative = false,
  }: {
    code?: string
    label: string
    amount: number
    isHighlight?: boolean
    isBold?: boolean
    isReadOnly?: boolean
    isNegative?: boolean
  }) {
    const p = pct(amount)
    return (
      <tr className={`${isHighlight ? 'bg-primary/10 font-bold' : ''} ${isBold ? 'font-semibold' : ''}`}>
        <td className="text-xs text-base-content/50 w-16">{code}</td>
        <td className="text-sm">
          {label}
          {isReadOnly && (
            <span className="badge badge-ghost badge-xs ml-2">อัตโนมัติ</span>
          )}
        </td>
        <td className={`text-right font-mono text-sm ${isNegative || amount < 0 ? 'text-error' : ''}`}>
          {formatBaht(amount)}
        </td>
        <td className="text-right font-mono text-xs text-base-content/60">
          {formatPercent(p.pctBeforeDiscount)}
        </td>
        <td className="text-right font-mono text-xs text-base-content/60">
          {formatPercent(p.pctAfterDiscount)}
        </td>
      </tr>
    )
  }

  function SectionHeader({ title }: { title: string }) {
    return (
      <tr className="bg-base-200">
        <td colSpan={5} className="font-bold text-sm py-2">{title}</td>
      </tr>
    )
  }

  function SubtotalRow({ label, amount }: { label: string; amount: number }) {
    const p = pct(amount)
    return (
      <tr className="border-t-2 border-base-300 font-bold">
        <td></td>
        <td className="text-sm">{label}</td>
        <td className={`text-right font-mono text-sm ${amount < 0 ? 'text-error' : ''}`}>
          {formatBaht(amount)}
        </td>
        <td className="text-right font-mono text-xs">{formatPercent(p.pctBeforeDiscount)}</td>
        <td className="text-right font-mono text-xs">{formatPercent(p.pctAfterDiscount)}</td>
      </tr>
    )
  }

  function ProfitRow({ label, amount }: { label: string; amount: number }) {
    const p = pct(amount)
    return (
      <tr className={`font-bold text-lg ${amount >= 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
        <td></td>
        <td>{label}</td>
        <td className="text-right font-mono">{formatBaht(amount)}</td>
        <td className="text-right font-mono text-sm">{formatPercent(p.pctBeforeDiscount)}</td>
        <td className="text-right font-mono text-sm">{formatPercent(p.pctAfterDiscount)}</td>
      </tr>
    )
  }

  // Revenue: show all channels that have data + known codes
  const revenueChannelCodes = report
    ? Object.keys(report.revenue.salesByChannel).sort()
    : []
  const discountCodes: PLCode[] = ['0111', '0112', '0113']

  // COGS codes (auto from inventory)
  const cogsCodes: { code: PLCode; key: keyof NonNullable<typeof report>['cogs'] }[] = [
    { code: '0201', key: 'food' },
    { code: '0202', key: 'beverage' },
    { code: '0203', key: 'alcohol' },
    { code: '0204', key: 'dessert' },
    { code: '0205', key: 'packaging' },
    { code: '0206', key: 'ice' },
    { code: '0207', key: 'gas' },
  ]

  // Labor codes
  const laborCodes: { code: PLCode; key: keyof NonNullable<typeof report>['labor'] }[] = [
    { code: '0301', key: 'branchSalary' },
    { code: '0302', key: 'branchOT' },
    { code: '0303', key: 'branchWelfare' },
    { code: '0304', key: 'branchSS' },
    { code: '0305', key: 'branchDeductions' },
    { code: '0306', key: 'hqSalary' },
    { code: '0307', key: 'hqOT' },
    { code: '0308', key: 'hqWelfare' },
    { code: '0309', key: 'hqSS' },
    { code: '0310', key: 'hqDeductions' },
    { code: '0311', key: 'travel' },
    { code: '0312', key: 'medical' },
    { code: '0313', key: 'bonus' },
  ]

  // Controllable codes
  const controllableCodes: PLCode[] = [
    '0401', '0402', '0403', '0404', '0405',
    '0406', '0407', '0408', '0409', '0410', '0411',
  ]

  // Non-controllable codes
  const nonControllableCodes: PLCode[] = ['0501', '0502', '0503', '0504', '0505']

  // Year options (current -2 to +1)
  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="text-primary" size={28} />
          <div>
            <h1 className="text-2xl font-bold">งบกำไร-ขาดทุน (P&L)</h1>
            <p className="text-sm text-base-content/60">
              {activeBranch?.name ?? 'ไม่ได้เลือกสาขา'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="select select-bordered select-sm"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {THAI_MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{toBuddhistYear(y)}</option>
            ))}
          </select>

          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => window.print()}
            title="พิมพ์"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !report && (
        <div className="text-center py-12 text-base-content/50">
          ไม่พบข้อมูล กรุณาเลือกสาขาและเดือน
        </div>
      )}

      {/* P&L Table */}
      {!loading && report && (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="bg-base-200">
                <th className="w-16">รหัส</th>
                <th>รายการ</th>
                <th className="text-right w-36">จำนวนเงิน (฿)</th>
                <th className="text-right w-28">% ก่อนส่วนลด</th>
                <th className="text-right w-28">% หลังส่วนลด</th>
              </tr>
            </thead>
            <tbody>
              {/* ═══ Revenue ═══ */}
              <SectionHeader title="รายได้การขาย (Revenue)" />
              {revenueChannelCodes.map(code => (
                <PLRow
                  key={code}
                  code={code}
                  label={PL_CODES[code as PLCode] ?? `ช่องทาง ${code}`}
                  amount={report.revenue.salesByChannel[code] ?? 0}
                />
              ))}
              {discountCodes.map(code => (
                <PLRow
                  key={code}
                  code={code}
                  label={PL_CODES[code]}
                  amount={report.revenue.discountsByType[code] ?? 0}
                  isNegative
                />
              ))}
              <PLRow code="0114" label={PL_CODES['0114']} amount={report.revenue.vat} isNegative />
              <PLRow code="0115" label={PL_CODES['0115']} amount={report.revenue.cashOverShort} />
              <SubtotalRow label="รวมรายได้การขาย" amount={report.revenue.netRevenue} />

              {/* ═══ COGS ═══ */}
              <SectionHeader title="ต้นทุนขาย (COGS)" />
              {cogsCodes.map(({ code, key }) => (
                <PLRow
                  key={code}
                  code={code}
                  label={PL_CODES[code]}
                  amount={report.cogs[key] as number}
                  isReadOnly={['0201', '0202', '0203', '0204', '0205'].includes(code)}
                />
              ))}
              <SubtotalRow label="รวมต้นทุนขาย" amount={report.cogs.total} />

              {/* ═══ Labor ═══ */}
              <SectionHeader title="ค่าใช้จ่ายพนักงาน (Labor)" />
              {laborCodes.map(({ code, key }) => (
                <PLRow
                  key={code}
                  code={code}
                  label={PL_CODES[code]}
                  amount={report.labor[key] as number}
                />
              ))}
              <SubtotalRow label="รวมค่าใช้จ่ายพนักงาน" amount={report.labor.total} />

              {/* ★ GP */}
              <ProfitRow label="Gross Profit (GP)" amount={report.gp} />

              {/* ═══ Controllable ═══ */}
              <SectionHeader title="ค่าใช้จ่ายที่ควบคุมได้ (Controllable)" />
              {controllableCodes.map(code => (
                <PLRow
                  key={code}
                  code={code}
                  label={PL_CODES[code as PLCode] ?? `ค่าใช้จ่ายเพิ่มเติม ${code}`}
                  amount={report.controllable.items[code] ?? 0}
                  isReadOnly={code === '0409'}
                />
              ))}
              <SubtotalRow label="รวม Controllable" amount={report.controllable.total} />

              {/* ★ PAC */}
              <ProfitRow label="PAC" amount={report.pac} />

              {/* ═══ Non-controllable ═══ */}
              <SectionHeader title="ค่าใช้จ่ายที่ควบคุมไม่ได้ (Non-controllable)" />
              {nonControllableCodes.map(code => (
                <PLRow
                  key={code}
                  code={code}
                  label={PL_CODES[code as PLCode] ?? `ค่าใช้จ่ายไม่ควบคุม ${code}`}
                  amount={report.nonControllable.items[code] ?? 0}
                />
              ))}
              <SubtotalRow label="รวม Non-controllable" amount={report.nonControllable.total} />

              {/* ★ EBITDA */}
              <ProfitRow label="EBITDA" amount={report.ebitda} />

              {/* Depreciation */}
              <PLRow code="0601" label={PL_CODES['0601']} amount={report.depreciation} />

              {/* ★ EBIT */}
              <ProfitRow label="EBIT" amount={report.ebit} />

              {/* Interest & Tax */}
              <PLRow code="0701" label={PL_CODES['0701']} amount={report.interest} />
              <PLRow code="0702" label={PL_CODES['0702']} amount={report.tax} />

              {/* ★ Net Profit */}
              <ProfitRow label="Net Profit (กำไรสุทธิ)" amount={report.netProfit} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
