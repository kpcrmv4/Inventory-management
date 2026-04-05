import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, Search, Trash2, Eye, EyeOff } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'
import { useAuth } from '../../../hooks/useAuth'
import { RECIPE_CATEGORIES } from '../../../lib/constants'
import { formatBaht } from '../../../lib/currency'
import type { RecipeCategory } from '../../../types/database'

export default function RecipesPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const navigate = useNavigate()
  const { recipes, loading, createRecipe, deleteRecipe, toggleActive } = useRecipes()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<RecipeCategory | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<RecipeCategory>('food')
  const [newPrice, setNewPrice] = useState('')

  const filtered = recipes.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && r.category !== filterCategory) return false
    return true
  })

  const handleCreate = async () => {
    if (!newName.trim()) return
    const id = await createRecipe(newName.trim(), newCategory, parseFloat(newPrice) || 0)
    if (id) {
      setShowModal(false)
      setNewName('')
      setNewPrice('')
      navigate(`/app/recipes/${id}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-box bg-gradient-brand text-white shadow-lg shadow-primary/20">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">สูตรอาหาร</h1>
            <p className="text-sm text-base-content/50">{recipes.length} เมนู</p>
          </div>
        </div>

        {isOwner && (
          <button className="btn btn-primary btn-sm gap-2 shadow-md shadow-primary/20" onClick={() => setShowModal(true)}>
            <Plus size={16} /> เพิ่มเมนู
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="input input-bordered input-sm flex items-center gap-2 flex-1">
          <Search size={16} className="text-base-content/40" />
          <input
            type="text"
            placeholder="ค้นหาเมนู..."
            className="grow"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="select select-bordered select-sm w-full sm:w-40"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as RecipeCategory | '')}
        >
          <option value="">ทุกหมวด</option>
          {Object.entries(RECIPE_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-base-content/50">
          {recipes.length === 0 ? 'ยังไม่มีสูตรอาหาร กดปุ่ม "เพิ่มเมนู" เพื่อเริ่มต้น' : 'ไม่พบเมนูที่ค้นหา'}
        </div>
      )}

      {/* Recipe list */}
      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>เมนู</th>
                <th>หมวด</th>
                <th>ตัวเลือก</th>
                <th className="text-right">ราคาขาย</th>
                <th className="text-center">สถานะ</th>
                {isOwner && <th className="text-center w-24">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover cursor-pointer"
                  onClick={() => navigate(`/app/recipes/${r.id}`)}
                >
                  <td className="font-medium">{r.name}</td>
                  <td>
                    <span className="badge badge-ghost badge-sm">
                      {RECIPE_CATEGORIES[r.category]}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {r.variants.map((v) => (
                        <span key={v.id} className="badge badge-outline badge-xs">
                          {v.name}
                          {v.ingredient_count > 0 && (
                            <span className="ml-1 text-base-content/50">({v.ingredient_count})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right font-mono">
                    {r.variants.length === 1
                      ? formatBaht(r.variants[0].selling_price)
                      : `${formatBaht(Math.min(...r.variants.map(v => v.selling_price)))} - ${formatBaht(Math.max(...r.variants.map(v => v.selling_price)))}`
                    }
                  </td>
                  <td className="text-center">
                    <span className={`badge badge-xs ${r.is_active ? 'badge-success' : 'badge-error'}`}>
                      {r.is_active ? 'เปิด' : 'ปิด'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="btn btn-ghost btn-xs"
                          title={r.is_active ? 'ปิดเมนู' : 'เปิดเมนู'}
                          onClick={() => toggleActive(r.id, r.is_active)}
                        >
                          {r.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          title="ลบ"
                          onClick={() => {
                            if (confirm(`ลบเมนู "${r.name}" ?`)) deleteRecipe(r.id)
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">เพิ่มเมนูใหม่</h3>

            <div className="form-control gap-3">
              <div>
                <label className="label label-text">ชื่อเมนู</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="เช่น ข้าวผัดกุ้ง"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="label label-text">หมวด</label>
                <select
                  className="select select-bordered w-full"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as RecipeCategory)}
                >
                  {Object.entries(RECIPE_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label label-text">ราคาขาย (ปกติ)</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
                สร้าง
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  )
}
