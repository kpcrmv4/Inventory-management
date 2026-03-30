import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useBranch } from '../../../hooks/useBranch'
import { useAuth } from '../../../hooks/useAuth'
import { showSuccess, showError } from '../../../lib/toast'

export interface Complaint {
  id: string
  branch_id: string
  complaint_date: string
  type: string
  detail: string
  image_url: string | null
  staff_id: string | null
  resolved_at: string | null
  created_at: string
}

interface NewComplaint {
  complaint_date: string
  type: string
  detail: string
  image?: File | null
}

export function useComplaints() {
  const { activeBranch } = useBranch()
  const { profile } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComplaints = useCallback(async () => {
    if (!activeBranch?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('branch_id', activeBranch.id)
        .order('complaint_date', { ascending: false })

      if (error) throw error
      setComplaints(data ?? [])
    } catch (err) {
      console.error('Failed to fetch complaints:', err)
      showError('ไม่สามารถโหลดข้อมูลข้อร้องเรียนได้')
    } finally {
      setLoading(false)
    }
  }, [activeBranch?.id])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const addComplaint = useCallback(async (data: NewComplaint) => {
    if (!activeBranch?.id || !profile) return

    try {
      let imageUrl: string | null = null

      // Upload image if provided
      if (data.image) {
        const fileExt = data.image.name.split('.').pop()
        const fileName = `${activeBranch.id}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('complaints')
          .upload(fileName, data.image)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('complaints')
          .getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      const { error } = await supabase
        .from('complaints')
        .insert({
          branch_id: activeBranch.id,
          complaint_date: data.complaint_date,
          type: data.type,
          detail: data.detail,
          image_url: imageUrl,
          staff_id: profile.id,
          resolved_at: null,
        })

      if (error) throw error
      showSuccess('บันทึกข้อร้องเรียนสำเร็จ')
      await fetchComplaints()
    } catch (err) {
      console.error('Failed to add complaint:', err)
      showError('ไม่สามารถบันทึกข้อร้องเรียนได้')
    }
  }, [activeBranch?.id, profile, fetchComplaints])

  const resolveComplaint = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      showSuccess('อัปเดตสถานะสำเร็จ')
      await fetchComplaints()
    } catch (err) {
      console.error('Failed to resolve complaint:', err)
      showError('ไม่สามารถอัปเดตสถานะได้')
    }
  }, [fetchComplaints])

  return { complaints, loading, addComplaint, resolveComplaint, refetch: fetchComplaints }
}
