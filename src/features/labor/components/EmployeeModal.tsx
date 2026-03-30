import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { EmployeeType } from '../../../types/database'

interface EmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    position: string
    salary: number
    type: EmployeeType
    start_date: string
  }) => void
  employeeType: EmployeeType
  typeLabel: string
}

export function EmployeeModal({
  isOpen,
  onClose,
  onSubmit,
  employeeType,
  typeLabel,
}: EmployeeModalProps) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState(0)
  const [startDate, setStartDate] = useState('')

  const handleSubmit = () => {
    if (!name.trim() || !position.trim() || salary <= 0 || !startDate) return
    onSubmit({
      name: name.trim(),
      position: position.trim(),
      salary,
      type: employeeType,
      start_date: startDate,
    })
    setName('')
    setPosition('')
    setSalary(0)
    setStartDate('')
    onClose()
  }

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          <UserPlus className="w-5 h-5 inline mr-2" />
          เพิ่มพนักงาน {typeLabel}
        </h3>
        <div className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">ชื่อ-สกุล</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อพนักงาน"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">ตำแหน่ง</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="ตำแหน่ง"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">เงินเดือน (บาท)</span>
            </label>
            <input
              type="number"
              className="input input-bordered text-right"
              value={salary || ''}
              onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">วันที่เริ่มงาน</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim() || !position.trim() || salary <= 0 || !startDate}
          >
            เพิ่มพนักงาน
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}
