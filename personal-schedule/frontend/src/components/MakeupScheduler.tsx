import React, { useState, useEffect } from 'react'
import {
  ScheduleModal,
  FormGroup,
  FormInput,
  FormRow,
  ScheduleToast,
  ScheduleAlert,
  FormSelect,
  FormTextarea,
} from './ScheduleEditor'
import type { Schedule, ScheduleOverride, Subject, Period } from '../types'

interface MakeupSchedulerProps {
  schedule: Schedule | null
  isOpen: boolean
  overrideToEdit?: ScheduleOverride
  onClose: () => void
  onSave: (data: Partial<ScheduleOverride>) => Promise<void>
  subjects: Subject[]
  periods: Period[]
  isLoading?: boolean
}

const initialFormData = {
  new_date: '',
  new_start_period: '',
  new_end_period: '',
  new_room: '',
  reason: '',
  note: '',
}

export function MakeupScheduler({
  schedule,
  isOpen,
  overrideToEdit,
  onClose,
  onSave,
  subjects,
  periods,
  isLoading = false,
}: MakeupSchedulerProps): React.ReactElement | null {
  const [formData, setFormData] = useState<Partial<ScheduleOverride>>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (overrideToEdit) {
        // Chế độ chỉnh sửa: điền form từ override có sẵn
        setFormData({
          new_date: overrideToEdit.new_date || '',
          new_start_period: overrideToEdit.new_start_period || '',
          new_end_period: overrideToEdit.new_end_period || '',
          new_room: overrideToEdit.new_room || '',
          reason: overrideToEdit.reason || '',
          note: overrideToEdit.note || '',
        })
      } else {
        // Chế độ tạo mới: điền form từ lịch học gốc
        setFormData({ ...initialFormData, new_room: schedule?.room || '' })
      }
      setErrors({})
    }
  }, [schedule, isOpen, overrideToEdit])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.new_date) newErrors.new_date = 'Vui lòng chọn ngày học bù'
    if (!formData.new_start_period) newErrors.new_start_period = 'Vui lòng chọn tiết bắt đầu'
    if (!formData.new_end_period) newErrors.new_end_period = 'Vui lòng chọn tiết kết thúc'
    if (
      formData.new_start_period &&
      formData.new_end_period &&
      Number(formData.new_start_period) > Number(formData.new_end_period)
    ) {
      newErrors.new_end_period = 'Tiết kết thúc phải sau tiết bắt đầu'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await onSave(formData)
      setToast({ message: 'Lưu lịch học bù thành công!', type: 'success' })
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

  if (!isOpen && !toast) {
    return null
  }

  const subject = subjects.find((s) => s.id === schedule?.subject_id)

  return (
    <>
      <ScheduleModal
        isOpen={isOpen}
        title={overrideToEdit ? `Chỉnh sửa học bù` : `Học bù cho: ${subject?.name || 'Môn học'}`}
        onClose={onClose}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Lưu học bù"
      >
        <FormRow>
          <FormInput
            label="Ngày học bù"
            type="date"
            required
            value={formData.new_date || ''}
            onChange={(e) => setFormData({ ...formData, new_date: e.target.value })}
            error={errors.new_date}
          />
          <FormInput
            label="Phòng học mới"
            value={formData.new_room || ''}
            onChange={(e) => setFormData({ ...formData, new_room: e.target.value })}
            placeholder="Ví dụ: A1-101"
          />
        </FormRow>

        <FormRow>
          <FormSelect
            label="Tiết bắt đầu"
            required
            value={String(formData.new_start_period || '')}
            onChange={(e) => {
              const newStartPeriod = Number(e.target.value)
              if (!schedule || !newStartPeriod) {
                setFormData({ ...formData, new_start_period: newStartPeriod, new_end_period: '' })
                return
              }

              const duration = schedule.end_period - schedule.start_period
              const newEndPeriod = newStartPeriod + duration

              const maxPeriod = Math.max(...periods.map((p) => p.period_number), 0)

              // Chỉ tự động cập nhật nếu tiết kết thúc mới hợp lệ
              setFormData({ ...formData, new_start_period: newStartPeriod, new_end_period: newEndPeriod <= maxPeriod ? newEndPeriod : '' })
            }}
            options={periods.map((p) => ({ value: p.period_number, label: `Tiết ${p.period_number}` }))}
            error={errors.new_start_period}
          />
          <FormSelect
            label="Tiết kết thúc"
            required
            value={String(formData.new_end_period || '')}
            onChange={(e) => setFormData({ ...formData, new_end_period: Number(e.target.value) })}
            options={periods.map((p) => ({ value: p.period_number, label: `Tiết ${p.period_number}` }))}
            error={errors.new_end_period}
          />
        </FormRow>

        <FormTextarea
          label="Lý do/Ghi chú"
          value={formData.reason || ''}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Ví dụ: Bù cho ngày nghỉ lễ 30/4"
        />
      </ScheduleModal>

      {toast && (
        <ScheduleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          autoClose={toast.type === 'success'}
        />
      )}
    </>
  )
}