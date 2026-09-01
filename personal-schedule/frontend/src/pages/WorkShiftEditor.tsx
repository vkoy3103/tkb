import React, { useState, useEffect } from 'react'
import {
  ScheduleModal,
  FormInput,
  FormRow,
  ScheduleToast,
  FormSelect,
  FormTextarea,
} from '../components/ScheduleEditor'
import type { WorkShift } from '../types'

interface WorkShiftEditorProps {
  shiftToEdit?: WorkShift | null
  // Giá trị khởi tạo khi TẠO MỚI (vd: bấm vào khung giờ ca cố định)
  preset?: Partial<WorkShift>
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<WorkShift>) => Promise<void>
  onDelete?: () => Promise<void>
  isLoading?: boolean
}

const initialFormData: Partial<WorkShift> = {
  date: '',
  shift_type: 'SHIFT 1',
  scheduled_start: '09:00',
  scheduled_end: '13:00',
  actual_start: '',
  actual_end: '',
  status: 'scheduled',
  coefficient: 1,
  note: '',
}

// Hệ số ca phổ biến (ca lễ x2, x1.5...)
const COEFFICIENT_PRESETS = [1, 1.5, 2, 2.5, 3]

// 3 ca cố định — không có ca nào tự chỉnh giờ
export const FIXED_SHIFTS = [
  { value: 'SHIFT 1', label: 'SHIFT 1', start: '09:00', end: '13:00' },
  { value: 'SHIFT 2', label: 'SHIFT 2', start: '13:00', end: '18:00' },
  { value: 'SHIFT 3', label: 'SHIFT 3', start: '18:00', end: '22:00' },
]

// Tìm ca cố định trùng giờ nhiều nhất với khoảng [start, end] (dùng cho ca thêm vào chỗ môn nghỉ)
export function findBestFixedShift(start?: string | null, end?: string | null): string {
  if (!start || !end) return 'SHIFT 1'
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const s = toMin(start)
  const e = toMin(end)
  let best = FIXED_SHIFTS[0].value
  let bestOverlap = 0
  for (const f of FIXED_SHIFTS) {
    const fs = toMin(f.start)
    const fe = toMin(f.end)
    const overlap = Math.max(0, Math.min(e, fe) - Math.max(s, fs))
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      best = f.value
    }
  }
  return best
}

const statusOptions = [
  { value: 'scheduled', label: 'Theo lịch' },
  { value: 'done', label: 'Đã làm' },
  { value: 'cancelled', label: 'Đã hủy' },
]

export function WorkShiftEditor({
  shiftToEdit,
  preset,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isLoading = false,
}: WorkShiftEditorProps): React.ReactElement | null {
  const [formData, setFormData] = useState<Partial<WorkShift>>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (shiftToEdit) {
        // Chế độ chỉnh sửa — giữ nguyên giờ đã có (có thể là ca tự do cũ)
        setFormData({
          date: shiftToEdit.date,
          shift_type: shiftToEdit.shift_type,
          scheduled_start: shiftToEdit.scheduled_start,
          scheduled_end: shiftToEdit.scheduled_end,
          actual_start: shiftToEdit.actual_start || '',
          actual_end: shiftToEdit.actual_end || '',
          status: shiftToEdit.status || 'scheduled',
          coefficient: Number(shiftToEdit.coefficient) || 1,
          note: shiftToEdit.note || '',
        })
      } else {
        // Chế độ tạo mới (kết hợp preset nếu có)
        // Nếu preset có giờ (vd: từ chỗ môn nghỉ) → tự chọn ca cố định trùng giờ nhiều nhất
        let shiftType = 'SHIFT 1'
        if (preset?.scheduled_start && preset?.scheduled_end) {
          shiftType = findBestFixedShift(preset.scheduled_start, preset.scheduled_end)
        } else if (FIXED_SHIFTS.some((s) => s.value === preset?.shift_type)) {
          shiftType = preset?.shift_type as string
        }
        const presetShift = FIXED_SHIFTS.find((s) => s.value === shiftType)!
        setFormData({
          ...initialFormData,
          ...preset,
          shift_type: presetShift.value,
          scheduled_start: presetShift.start,
          scheduled_end: presetShift.end,
        })
      }
      setErrors({})
      setToast(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftToEdit, isOpen])

  // Đổi loại ca → tự điền giờ cố định tương ứng (không chỉnh giờ tay)
  const handleShiftTypeChange = (value: string) => {
    const fixed = FIXED_SHIFTS.find((s) => s.value === value)
    setFormData((prev) => ({
      ...prev,
      shift_type: value,
      scheduled_start: fixed ? fixed.start : prev.scheduled_start,
      scheduled_end: fixed ? fixed.end : prev.scheduled_end,
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.date) newErrors.date = 'Vui lòng chọn ngày'
    if (!formData.scheduled_start) newErrors.scheduled_start = 'Vui lòng nhập giờ bắt đầu'
    if (!formData.scheduled_end) newErrors.scheduled_end = 'Vui lòng nhập giờ kết thúc'
    if (
      formData.actual_start &&
      formData.actual_end &&
      formData.actual_start >= formData.actual_end
    ) {
      newErrors.actual_end = 'Giờ kết thúc thực tế phải sau giờ bắt đầu'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await onSave({
        date: formData.date,
        shift_type: formData.shift_type,
        scheduled_start: formData.scheduled_start,
        scheduled_end: formData.scheduled_end,
        actual_start: formData.actual_start || null,
        actual_end: formData.actual_end || null,
        status: formData.status || 'scheduled',
        coefficient: Number(formData.coefficient) || 1,
        note: formData.note?.trim() || null,
      })
      // Đóng modal NGAY sau khi lưu thành công — không hiện thông báo popup
      onClose()
    } catch (error) {
      setToast({
        message: `Lỗi: ${(error as Error).message}`,
        type: 'error',
      })
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    try {
      await onDelete()
      onClose()
    } catch (error) {
      setToast({ message: `Lỗi: ${(error as Error).message}`, type: 'error' })
    }
  }

  if (!isOpen && !toast) {
    return null
  }

  return (
    <>
      <ScheduleModal
        isOpen={isOpen}
        title={shiftToEdit ? 'Chỉnh sửa ca làm' : 'Thêm ca làm mới'}
        onClose={onClose}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Lưu ca làm"
        showDeleteButton={!!shiftToEdit}
        onDelete={handleDelete}
      >
        <FormRow>
          <FormInput
            label="Ngày làm"
            type="date"
            required
            value={formData.date || ''}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            error={errors.date}
          />
          <FormSelect
            label="Loại ca"
            value={formData.shift_type || 'SHIFT 1'}
            onChange={(e) => handleShiftTypeChange(e.target.value)}
            options={FIXED_SHIFTS.map((s) => ({ value: s.value, label: s.label }))}
          />
        </FormRow>

        <FormRow>
          <FormInput
            label="Giờ bắt đầu"
            type="time"
            required
            value={formData.scheduled_start || ''}
            onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
            error={errors.scheduled_start}
            disabled
          />
          <FormInput
            label="Giờ kết thúc"
            type="time"
            required
            value={formData.scheduled_end || ''}
            onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
            error={errors.scheduled_end}
            disabled
          />
        </FormRow>

        <FormRow>
          <FormInput
            label="Giờ bắt đầu thực tế"
            type="time"
            value={formData.actual_start || ''}
            onChange={(e) => setFormData({ ...formData, actual_start: e.target.value })}
            helper="Để trống nếu chưa chấm công"
          />
          <FormInput
            label="Giờ kết thúc thực tế"
            type="time"
            value={formData.actual_end || ''}
            onChange={(e) => setFormData({ ...formData, actual_end: e.target.value })}
            error={errors.actual_end}
          />
        </FormRow>

        <FormRow>
          <FormSelect
            label="Trạng thái"
            value={formData.status || 'scheduled'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={statusOptions}
          />
          <FormSelect
            label="Hệ số ca"
            value={Number(formData.coefficient) || 1}
            onChange={(e) => setFormData({ ...formData, coefficient: Number(e.target.value) || 1 })}
            options={COEFFICIENT_PRESETS.map((v) => ({ value: v, label: `x${v}` }))}
            helper="Ca lễ x2/x1.5 — chỉ nhân lương cơ bản"
          />
        </FormRow>

        <FormTextarea
          label="Ghi chú"
          value={formData.note || ''}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Thêm ghi chú cho ca làm..."
        />
      </ScheduleModal>

      {toast && <ScheduleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}