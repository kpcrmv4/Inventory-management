import { formatBaht } from '../../../lib/currency'
import type { LaborRecord } from '../hooks/useLabor'

interface LaborFormProps {
  employeeName: string
  position: string
  record: LaborRecord
  onUpdate: (updates: Partial<LaborRecord>) => void
}

function Field({ label, value, onChange, placeholder }: {
  label: string
  value: number | ''
  onChange: (v: number) => void
  placeholder?: string
}) {
  return (
    <div className="form-control">
      <label className="label py-0.5">
        <span className="label-text text-[11px] font-medium text-base-content/50">{label}</span>
      </label>
      <input
        type="number"
        className="input input-bordered input-sm text-right"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder}
      />
    </div>
  )
}

function DualField({ label, inputValue, displayValue, onChange, placeholder, color = '' }: {
  label: string
  inputValue: number | ''
  displayValue: string
  onChange: (v: number) => void
  placeholder?: string
  color?: string
}) {
  return (
    <div className="form-control">
      <label className="label py-0.5">
        <span className="label-text text-[11px] font-medium text-base-content/50">{label}</span>
      </label>
      <div className="flex gap-1.5">
        <input
          type="number"
          className="input input-bordered input-sm w-20 text-right"
          value={inputValue || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
        />
        <div className={`flex-1 flex items-center justify-end text-xs font-medium px-3 rounded-xl bg-base-200/50 ${color}`}>
          {displayValue}
        </div>
      </div>
    </div>
  )
}

export function LaborForm({ employeeName, position, record, onUpdate }: LaborFormProps) {
  return (
    <div className="collapse collapse-arrow bg-base-100 card-enhanced overflow-hidden">
      <input type="checkbox" />

      {/* Header */}
      <div className="collapse-title flex items-center justify-between pr-10">
        <div className="flex items-center gap-3">
          <div className="icon-circle-sm bg-primary/10">
            <span className="text-xs font-bold text-primary">
              {employeeName.charAt(0)}
            </span>
          </div>
          <div>
            <span className="font-bold text-sm">{employeeName}</span>
            <span className="text-base-content/40 text-xs ml-1.5">({position})</span>
          </div>
        </div>
        <span className="text-emerald-600 font-bold text-sm">{formatBaht(record.netPay)}</span>
      </div>

      {/* Content */}
      <div className="collapse-content px-4 pb-4">
        {/* รายได้ */}
        <div className="rounded-xl bg-emerald-50 p-4 mt-1 dark:bg-emerald-900/10">
          <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-600 mb-3">
            รายได้
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
            <Field
              label="เงินเดือน"
              value={record.salary}
              onChange={(v) => onUpdate({ salary: v })}
            />
            <DualField
              label="OT 1.0x (ชม.)"
              inputValue={record.ot1xHours}
              displayValue={formatBaht(record.ot1xAmount)}
              onChange={(v) => onUpdate({ ot1xHours: v })}
              placeholder="ชม."
            />
            <DualField
              label="OT 1.5x (ชม.)"
              inputValue={record.ot15xHours}
              displayValue={formatBaht(record.ot15xAmount)}
              onChange={(v) => onUpdate({ ot15xHours: v })}
              placeholder="ชม."
            />
            <DualField
              label="OT 3.0x (ชม.)"
              inputValue={record.ot3xHours}
              displayValue={formatBaht(record.ot3xAmount)}
              onChange={(v) => onUpdate({ ot3xHours: v })}
              placeholder="ชม."
            />
            <Field
              label="OT อื่นๆ"
              value={record.otCustom}
              onChange={(v) => onUpdate({ otCustom: v })}
            />
            <Field
              label="Service Charge"
              value={record.serviceCharge}
              onChange={(v) => onUpdate({ serviceCharge: v })}
            />
            <Field
              label="Incentive"
              value={record.incentive}
              onChange={(v) => onUpdate({ incentive: v })}
            />
            <Field
              label="ค่าอาหาร"
              value={record.foodAllowance}
              onChange={(v) => onUpdate({ foodAllowance: v })}
            />
            <Field
              label="ค่ารถ"
              value={record.transportAllowance}
              onChange={(v) => onUpdate({ transportAllowance: v })}
            />
            <Field
              label="เบี้ยขยัน"
              value={record.diligence}
              onChange={(v) => onUpdate({ diligence: v })}
            />
          </div>
          <div className="text-right mt-3 pt-2 border-t border-emerald-200/50 dark:border-emerald-700/30">
            <span className="text-xs text-base-content/50">รายได้รวม</span>
            <span className="font-bold text-sm text-emerald-600 ml-2">{formatBaht(record.totalIncome)}</span>
          </div>
        </div>

        {/* รายหัก */}
        <div className="rounded-xl bg-red-50 p-4 mt-3 dark:bg-red-900/10">
          <h4 className="font-bold text-xs uppercase tracking-wider text-red-500 mb-3">
            รายหัก
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
            <DualField
              label="ลาป่วย (วัน)"
              inputValue={record.sickLeaveDays}
              displayValue={formatBaht(record.sickLeaveAmount)}
              onChange={(v) => onUpdate({ sickLeaveDays: v })}
              placeholder="วัน"
              color="text-red-500"
            />
            <DualField
              label="ลากิจ (วัน)"
              inputValue={record.personalLeaveDays}
              displayValue={formatBaht(record.personalLeaveAmount)}
              onChange={(v) => onUpdate({ personalLeaveDays: v })}
              placeholder="วัน"
              color="text-red-500"
            />
            <DualField
              label="ขาดงาน (วัน)"
              inputValue={record.absentDays}
              displayValue={formatBaht(record.absentAmount)}
              onChange={(v) => onUpdate({ absentDays: v })}
              placeholder="วัน"
              color="text-red-500"
            />
            <DualField
              label="มาสาย (นาที)"
              inputValue={record.lateMinutes}
              displayValue={formatBaht(record.lateAmount)}
              onChange={(v) => onUpdate({ lateMinutes: v })}
              placeholder="นาที"
              color="text-red-500"
            />
            <Field
              label="หักเงินกู้"
              value={record.loanDeduction}
              onChange={(v) => onUpdate({ loanDeduction: v })}
            />
            <Field
              label="ภาษี"
              value={record.taxDeduction}
              onChange={(v) => onUpdate({ taxDeduction: v })}
            />
            <Field
              label="ประกันสังคม"
              value={record.socialSecurity}
              onChange={(v) => onUpdate({ socialSecurity: v })}
            />
          </div>
          <div className="text-right mt-3 pt-2 border-t border-red-200/50 dark:border-red-700/30">
            <span className="text-xs text-base-content/50">รายหักรวม</span>
            <span className="font-bold text-sm text-red-500 ml-2">{formatBaht(record.totalDeductions)}</span>
          </div>
        </div>

        {/* สรุป */}
        <div className="rounded-xl bg-gradient-brand p-4 mt-3 flex justify-between items-center">
          <span className="font-bold text-white/80 text-sm">จ่ายสุทธิ</span>
          <span className="font-extrabold text-xl text-white">{formatBaht(record.netPay)}</span>
        </div>
      </div>
    </div>
  )
}
