import { formatBaht } from '../../../lib/currency'
import type { LaborRecord } from '../hooks/useLabor'

interface LaborFormProps {
  employeeName: string
  position: string
  record: LaborRecord
  onUpdate: (updates: Partial<LaborRecord>) => void
}

export function LaborForm({ employeeName, position, record, onUpdate }: LaborFormProps) {
  const parseNum = (val: string) => {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  return (
    <div className="collapse collapse-arrow bg-base-200 mb-2">
      <input type="checkbox" />
      <div className="collapse-title font-medium flex items-center justify-between">
        <div>
          <span className="font-semibold">{employeeName}</span>
          <span className="text-base-content/60 text-sm ml-2">({position})</span>
        </div>
        <div className="text-right text-sm">
          <span className="text-success font-semibold">{formatBaht(record.netPay)}</span>
        </div>
      </div>
      <div className="collapse-content space-y-4">
        {/* รายได้ */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-primary">รายได้</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* เงินเดือน */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">เงินเดือน</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.salary || ''}
                onChange={(e) => onUpdate({ salary: parseNum(e.target.value) })}
              />
            </div>

            {/* OT 1.0x */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">OT 1.0x (ชม.)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input input-bordered input-sm w-20 text-right"
                  value={record.ot1xHours || ''}
                  onChange={(e) => onUpdate({ ot1xHours: parseNum(e.target.value) })}
                  placeholder="ชม."
                />
                <div className="input input-bordered input-sm flex-1 flex items-center justify-end bg-base-100 text-xs">
                  {formatBaht(record.ot1xAmount)}
                </div>
              </div>
            </div>

            {/* OT 1.5x */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">OT 1.5x (ชม.)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input input-bordered input-sm w-20 text-right"
                  value={record.ot15xHours || ''}
                  onChange={(e) => onUpdate({ ot15xHours: parseNum(e.target.value) })}
                  placeholder="ชม."
                />
                <div className="input input-bordered input-sm flex-1 flex items-center justify-end bg-base-100 text-xs">
                  {formatBaht(record.ot15xAmount)}
                </div>
              </div>
            </div>

            {/* OT 3.0x */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">OT 3.0x (ชม.)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input input-bordered input-sm w-20 text-right"
                  value={record.ot3xHours || ''}
                  onChange={(e) => onUpdate({ ot3xHours: parseNum(e.target.value) })}
                  placeholder="ชม."
                />
                <div className="input input-bordered input-sm flex-1 flex items-center justify-end bg-base-100 text-xs">
                  {formatBaht(record.ot3xAmount)}
                </div>
              </div>
            </div>

            {/* OT custom */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">OT อื่นๆ (บาท)</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.otCustom || ''}
                onChange={(e) => onUpdate({ otCustom: parseNum(e.target.value) })}
              />
            </div>

            {/* Service Charge */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Service Charge</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.serviceCharge || ''}
                onChange={(e) => onUpdate({ serviceCharge: parseNum(e.target.value) })}
              />
            </div>

            {/* Incentive */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Incentive</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.incentive || ''}
                onChange={(e) => onUpdate({ incentive: parseNum(e.target.value) })}
              />
            </div>

            {/* ค่าอาหาร */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">ค่าอาหาร</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.foodAllowance || ''}
                onChange={(e) => onUpdate({ foodAllowance: parseNum(e.target.value) })}
              />
            </div>

            {/* ค่ารถ */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">ค่ารถ</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.transportAllowance || ''}
                onChange={(e) => onUpdate({ transportAllowance: parseNum(e.target.value) })}
              />
            </div>

            {/* เบี้ยขยัน */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">เบี้ยขยัน</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.diligence || ''}
                onChange={(e) => onUpdate({ diligence: parseNum(e.target.value) })}
              />
            </div>
          </div>
          <div className="text-right mt-2 font-semibold text-sm text-primary">
            รายได้รวม: {formatBaht(record.totalIncome)}
          </div>
        </div>

        <div className="divider my-1" />

        {/* รายหัก */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-error">รายหัก</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* ลาป่วย */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">ลาป่วย (วัน)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input input-bordered input-sm w-20 text-right"
                  value={record.sickLeaveDays || ''}
                  onChange={(e) => onUpdate({ sickLeaveDays: parseNum(e.target.value) })}
                  placeholder="วัน"
                />
                <div className="input input-bordered input-sm flex-1 flex items-center justify-end bg-base-100 text-xs text-error">
                  {formatBaht(record.sickLeaveAmount)}
                </div>
              </div>
            </div>

            {/* ลากิจ */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">ลากิจ (วัน)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input input-bordered input-sm w-20 text-right"
                  value={record.personalLeaveDays || ''}
                  onChange={(e) => onUpdate({ personalLeaveDays: parseNum(e.target.value) })}
                  placeholder="วัน"
                />
                <div className="input input-bordered input-sm flex-1 flex items-center justify-end bg-base-100 text-xs text-error">
                  {formatBaht(record.personalLeaveAmount)}
                </div>
              </div>
            </div>

            {/* ขาดงาน */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">ขาดงาน (วัน)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input input-bordered input-sm w-20 text-right"
                  value={record.absentDays || ''}
                  onChange={(e) => onUpdate({ absentDays: parseNum(e.target.value) })}
                  placeholder="วัน"
                />
                <div className="input input-bordered input-sm flex-1 flex items-center justify-end bg-base-100 text-xs text-error">
                  {formatBaht(record.absentAmount)}
                </div>
              </div>
            </div>

            {/* มาสาย */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">มาสาย (นาที)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="input input-bordered input-sm w-20 text-right"
                  value={record.lateMinutes || ''}
                  onChange={(e) => onUpdate({ lateMinutes: parseNum(e.target.value) })}
                  placeholder="นาที"
                />
                <div className="input input-bordered input-sm flex-1 flex items-center justify-end bg-base-100 text-xs text-error">
                  {formatBaht(record.lateAmount)}
                </div>
              </div>
            </div>

            {/* หักเงินกู้ */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">หักเงินกู้</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.loanDeduction || ''}
                onChange={(e) => onUpdate({ loanDeduction: parseNum(e.target.value) })}
              />
            </div>

            {/* ภาษี */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">ภาษี</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.taxDeduction || ''}
                onChange={(e) => onUpdate({ taxDeduction: parseNum(e.target.value) })}
              />
            </div>

            {/* ประกันสังคม */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">ประกันสังคม</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-sm text-right"
                value={record.socialSecurity || ''}
                onChange={(e) => onUpdate({ socialSecurity: parseNum(e.target.value) })}
              />
            </div>
          </div>
          <div className="text-right mt-2 font-semibold text-sm text-error">
            รายหักรวม: {formatBaht(record.totalDeductions)}
          </div>
        </div>

        <div className="divider my-1" />

        {/* สรุป */}
        <div className="flex justify-between items-center px-2 py-2 bg-base-300 rounded-lg">
          <span className="font-semibold">จ่ายสุทธิ</span>
          <span className="font-bold text-lg text-success">{formatBaht(record.netPay)}</span>
        </div>
      </div>
    </div>
  )
}
