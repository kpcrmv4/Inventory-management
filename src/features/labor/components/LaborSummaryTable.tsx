import { formatBaht } from '../../../lib/currency'
import type { LaborRecord } from '../hooks/useLabor'

interface Employee {
  id: string
  name: string
  position: string
  salary: number
}

interface LaborSummaryTableProps {
  employees: Employee[]
  getRecord: (employeeId: string, salary: number) => LaborRecord
}

export function LaborSummaryTable({ employees, getRecord }: LaborSummaryTableProps) {
  if (employees.length === 0) return null

  const records = employees.map((emp) => ({
    employee: emp,
    record: getRecord(emp.id, emp.salary),
  }))

  const totalSalary = records.reduce((s, r) => s + r.record.salary, 0)
  const totalOT = records.reduce(
    (s, r) => s + r.record.ot1xAmount + r.record.ot15xAmount + r.record.ot3xAmount + r.record.otCustom,
    0,
  )
  const totalIncome = records.reduce((s, r) => s + r.record.totalIncome, 0)
  const totalDeductions = records.reduce((s, r) => s + r.record.totalDeductions, 0)
  const totalNetPay = records.reduce((s, r) => s + r.record.netPay, 0)

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>ชื่อพนักงาน</th>
            <th>ตำแหน่ง</th>
            <th className="text-right">เงินเดือน</th>
            <th className="text-right">OT รวม</th>
            <th className="text-right">รายได้รวม</th>
            <th className="text-right">รายหักรวม</th>
            <th className="text-right">จ่ายสุทธิ</th>
          </tr>
        </thead>
        <tbody>
          {records.map(({ employee, record }) => (
            <tr key={employee.id}>
              <td className="font-medium">{employee.name}</td>
              <td className="text-base-content/60">{employee.position}</td>
              <td className="text-right">{formatBaht(record.salary)}</td>
              <td className="text-right">
                {formatBaht(
                  record.ot1xAmount + record.ot15xAmount + record.ot3xAmount + record.otCustom,
                )}
              </td>
              <td className="text-right text-primary">{formatBaht(record.totalIncome)}</td>
              <td className="text-right text-error">{formatBaht(record.totalDeductions)}</td>
              <td className="text-right font-semibold text-success">
                {formatBaht(record.netPay)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={2}>รวมทั้งหมด ({employees.length} คน)</td>
            <td className="text-right">{formatBaht(totalSalary)}</td>
            <td className="text-right">{formatBaht(totalOT)}</td>
            <td className="text-right text-primary">{formatBaht(totalIncome)}</td>
            <td className="text-right text-error">{formatBaht(totalDeductions)}</td>
            <td className="text-right text-success">{formatBaht(totalNetPay)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
