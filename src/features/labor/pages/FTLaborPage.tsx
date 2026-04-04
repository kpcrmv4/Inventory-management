import { useState } from 'react'
import { Save, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useBranch } from '../../../hooks/useBranch'
import { useEmployees } from '../hooks/useEmployees'
import { useLabor } from '../hooks/useLabor'
import { LaborForm } from '../components/LaborForm'
import { LaborSummaryTable } from '../components/LaborSummaryTable'
import { EmployeeModal } from '../components/EmployeeModal'
import { formatMonthYear, toBuddhistYear } from '../../../lib/date-utils'
import { THAI_MONTHS } from '../../../lib/constants'

export default function FTLaborPage() {
  const { profile } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showModal, setShowModal] = useState(false)

  const { activeBranch } = useBranch()
  const branchId = activeBranch?.id ?? null
  const { employees, loading: loadingEmployees, createEmployee } = useEmployees(branchId, 'ft')
  const { getRecord, updateRecord, saveAll, saving, loading: loadingLabor } = useLabor(
    branchId,
    month,
    year,
  )

  const loading = loadingEmployees || loadingLabor

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            <Users className="w-6 h-6 inline mr-2" />
            พนักงาน Full-Time
          </h1>
          <p className="text-base-content/60 mt-1">{formatMonthYear(month, year)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>
                {toBuddhistYear(y)}
              </option>
            ))}
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => setShowModal(true)}>
            <UserPlus className="w-4 h-4" />
            เพิ่มพนักงาน
          </button>
          <button className="btn btn-primary btn-sm" onClick={saveAll} disabled={saving}>
            {saving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            บันทึก
          </button>
        </div>
      </div>

      {/* Summary Table */}
      {employees.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">สรุปเงินเดือน Full-Time</h2>
            <LaborSummaryTable employees={employees} getRecord={getRecord} />
          </div>
        </div>
      )}

      {/* Employee Forms */}
      {employees.length === 0 ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body text-center py-12">
            <Users className="w-12 h-12 mx-auto text-base-content/30" />
            <p className="text-base-content/60 mt-4">
              ยังไม่มีพนักงาน Full-Time ในสาขานี้
            </p>
            <button className="btn btn-primary btn-sm mt-4" onClick={() => setShowModal(true)}>
              <UserPlus className="w-4 h-4" />
              เพิ่มพนักงานคนแรก
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">รายละเอียดพนักงาน ({employees.length} คน)</h2>
          {employees.map((emp) => (
            <LaborForm
              key={emp.id}
              employeeName={emp.name}
              position={emp.position}
              record={getRecord(emp.id, emp.salary)}
              onUpdate={(updates) => updateRecord(emp.id, { ...updates, salary: updates.salary ?? emp.salary })}
            />
          ))}
        </div>
      )}

      {/* Save button (bottom) */}
      {employees.length > 0 && (
        <div className="flex justify-end pb-6">
          <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            บันทึกข้อมูลเงินเดือนทั้งหมด
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      <EmployeeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={createEmployee}
        employeeType="ft"
        typeLabel="Full-Time"
      />
    </div>
  )
}
