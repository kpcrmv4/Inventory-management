import { useState, useRef } from 'react'
import {
  MessageSquare, Plus, CheckCircle, Clock,
  Image as ImageIcon, X, Filter,
} from 'lucide-react'
import { useComplaints } from '../hooks/useComplaints'
import { formatThaiDate } from '../../../lib/date-utils'
import { showWarning } from '../../../lib/toast'

const COMPLAINT_TYPES = [
  'คุณภาพอาหาร',
  'การบริการ',
  'ความสะอาด',
  'ระยะเวลารอ',
  'ราคา/ส่วนลด',
  'Delivery',
  'อื่นๆ',
]

type FilterStatus = 'all' | 'unresolved' | 'resolved'

export default function ComplaintsPage() {
  const { complaints, loading, addComplaint, resolveComplaint } = useComplaints()
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formType, setFormType] = useState('')
  const [formDetail, setFormDetail] = useState('')
  const [formImage, setFormImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus === 'resolved') return c.resolved_at !== null
    if (filterStatus === 'unresolved') return c.resolved_at === null
    return true
  })

  const unresolvedCount = complaints.filter(c => !c.resolved_at).length

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFormImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  function clearImage() {
    setFormImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetForm() {
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormType('')
    setFormDetail('')
    clearImage()
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formType) {
      showWarning('กรุณาเลือกประเภทข้อร้องเรียน')
      return
    }
    if (!formDetail.trim()) {
      showWarning('กรุณากรอกรายละเอียด')
      return
    }

    setSubmitting(true)
    await addComplaint({
      complaint_date: formDate,
      type: formType,
      detail: formDetail.trim(),
      image: formImage,
    })
    setSubmitting(false)
    resetForm()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ข้อร้องเรียนลูกค้า</h1>
            <p className="text-sm text-base-content/50">
              ทั้งหมด {complaints.length} รายการ | ยังไม่แก้ไข {unresolvedCount} รายการ
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm gap-1 shadow-md shadow-primary/20"
          onClick={() => setShowForm(prev => !prev)}
        >
          <Plus size={16} />
          เพิ่มข้อร้องเรียน
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card bg-base-100 card-enhanced">
          <div className="card-body">
            <h3 className="card-title text-base">บันทึกข้อร้องเรียนใหม่</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">วันที่</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered input-sm w-full"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">ประเภท</span>
                  </label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    required
                  >
                    <option value="">เลือกประเภท</option>
                    {COMPLAINT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">รายละเอียด</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="อธิบายรายละเอียดข้อร้องเรียน..."
                  value={formDetail}
                  onChange={e => setFormDetail(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">รูปภาพ (ไม่บังคับ)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="file-input file-input-bordered file-input-sm w-full"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="relative mt-2 inline-block">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-32 h-32 object-cover rounded-lg border border-base-300"
                    />
                    <button
                      type="button"
                      className="btn btn-circle btn-xs btn-error absolute -top-2 -right-2"
                      onClick={clearImage}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resetForm}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  {submitting && <span className="loading loading-spinner loading-xs"></span>}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-base-content/50" />
        <div className="btn-group">
          {([
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'unresolved', label: 'ยังไม่แก้ไข' },
            { value: 'resolved', label: 'แก้ไขแล้ว' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              className={`btn btn-sm ${filterStatus === opt.value ? 'btn-active' : ''}`}
              onClick={() => setFilterStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Empty */}
      {!loading && filteredComplaints.length === 0 && (
        <div className="text-center py-12 text-base-content/50">
          ไม่มีข้อร้องเรียน
        </div>
      )}

      {/* List */}
      {!loading && filteredComplaints.length > 0 && (
        <div className="space-y-3">
          {filteredComplaints.map(complaint => (
            <div
              key={complaint.id}
              className={`card bg-base-100 card-enhanced ${
                complaint.resolved_at ? 'border-success/30' : 'border-warning/30'
              }`}
            >
              <div className="card-body p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {complaint.resolved_at ? (
                        <span className="badge badge-success badge-sm gap-1">
                          <CheckCircle size={12} /> แก้ไขแล้ว
                        </span>
                      ) : (
                        <span className="badge badge-warning badge-sm gap-1">
                          <Clock size={12} /> รอแก้ไข
                        </span>
                      )}
                      <span className="badge badge-ghost badge-sm">{complaint.type}</span>
                      <span className="text-xs text-base-content/50">
                        {formatThaiDate(complaint.complaint_date)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm">{complaint.detail}</p>

                    {complaint.image_url && (
                      <div className="mt-2">
                        <a
                          href={complaint.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ImageIcon size={14} /> ดูรูปภาพ
                        </a>
                      </div>
                    )}

                    {complaint.resolved_at && (
                      <p className="text-xs text-success mt-1">
                        แก้ไขเมื่อ {formatThaiDate(complaint.resolved_at)}
                      </p>
                    )}
                  </div>

                  {!complaint.resolved_at && (
                    <button
                      className="btn btn-success btn-sm btn-outline gap-1 shrink-0"
                      onClick={() => resolveComplaint(complaint.id)}
                    >
                      <CheckCircle size={14} />
                      แก้ไขแล้ว
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
