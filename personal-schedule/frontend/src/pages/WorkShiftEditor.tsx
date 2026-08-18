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
  shift_type: 'NORMAL',
  scheduled_start: '',
  scheduled_end: '',
  actual_start: '',
  actual_end: '',
  status: 'scheduled',
  note: '',
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
        // Chế độ chỉnh sửa
        setFormData({
          date: shiftToEdit.date,
          shift_type: shiftToEdit.shift_type,
          scheduled_start: shiftToEdit.scheduled_start,
          scheduled_end: shiftToEdit.scheduled_end,
          actual_start: shiftToEdit.actual_start || '',
          actual_end: shiftToEdit.actual_end || '',
          status: shiftToEdit.status || 'scheduled',
          note: shiftToEdit.note || '',
        })
      } else {
        // Chế độ tạo mới (kết hợp preset nếu có)
        setFormData({ ...initialFormData, ...preset })
      }
      setErrors({})
      setToast(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftToEdit, isOpen])

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
        note: formData.note?.trim() || null,
      })
      setToast({ message: 'Lưu ca làm thành công!', type: 'success' })
      setTimeout(() => {
        onClose()
        setToast(null)
      }, 1000)
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
      setToast({ message: 'Đã xóa ca làm!', type: 'success' })
      setTimeout(() => {
        onClose()
        setToast(null)
      }, 1000)
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
            value={formData.shift_type || 'NORMAL'}
            onChange={(e) => setFormData({ ...formData, shift_type: e.target.value })}
            options={[
              { value: 'NORMAL', label: 'Ca thường' },
              { value: 'SHIFT 1', label: 'SHIFT 1' },
              { value: 'SHIFT 2', label: 'SHIFT 2' },
              { value: 'SHIFT 3', label: 'SHIFT 3' },
            ]}
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
          />
          <FormInput
            label="Giờ kết thúc"
            type="time"
            required
            value={formData.scheduled_end || ''}
            onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
            error={errors.scheduled_end}
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