import React, { useState, useEffect } from 'react'
import {
  ScheduleModal,
  FormGroup,
  FormInput,
  FormRow,
  ScheduleToast,
  ContextMenu,
  ScheduleAlert,
} from './ScheduleEditor'
import type { Schedule, ScheduleOverride, Subject, Period } from '../types'

interface InlineScheduleEditorProps {
  schedule: Schedule | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Schedule>) => Promise<void>
  onDelete: (id: number | string) => Promise<void>
  subjects: Subject[]
  periods: Period[]
  isLoading?: boolean
  contextMenu?: { x: number; y: number } | null
  onContextMenuClose?: () => void
}

export function InlineScheduleEditor({
  schedule,
  isOpen,
  onClose,
  onSave,
  onDelete,
  subjects,
  periods,
  isLoading = false,
  contextMenu,
  onContextMenuClose,
}: InlineScheduleEditorProps) {
  const [formData, setFormData] = useState<Partial<Schedule>>(
    schedule || {
      subject_id: 0,
      weekday: 1,
      start_period: 1,
      end_period: 2,
      room: '',
      note: '',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (schedule && isOpen) {
      setFormData(schedule)
      setErrors({})
    }
  }, [schedule, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.subject_id) newErrors.subject_id = 'Vui lòng chọn môn học'
    if (!formData.weekday) newErrors.weekday = 'Vui lòng chọn thứ'
    if (!formData.start_period) newErrors.start_period = 'Vui lòng chọn tiết bắt đầu'
    if (!formData.end_period) newErrors.end_period = 'Vui lòng chọn tiết kết thúc'
    if (
      formData.start_period &&
      formData.end_period &&
      (formData.start_period as number) > (formData.end_period as number)
    ) {
      newErrors.end_period = 'Tiết kết thúc phải sau tiết bắt đầu'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await onSave(formData)
      setToast({ message: 'Lưu thành công!', type: 'success' })
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
    if (!schedule) return
    if (!confirm('Bạn chắc chắn muốn xóa lịch này?')) return

    try {
      await onDelete(schedule.id)
      setToast({ message: 'Xóa thành công!', type: 'success' })
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

  const subjectName = subjects.find((s) => s.id === formData.subject_id)?.name || 'Lịch học'
  const weekdayNames = [
    'Thứ 2',
    'Thứ 3',
    'Thứ 4',
    'Thứ 5',
    'Thứ 6',
    'Thứ 7',
    'Chủ nhật',
  ]

  return (
    <>
      <ScheduleModal
        isOpen={isOpen}
        title={schedule ? `Chỉnh sửa: ${subjectName}` : 'Thêm lịch học mới'}
        onClose={onClose}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        showDeleteButton={!!schedule}
        onDelete={handleDelete}
      >
        {formData.subject_id && (
          <ScheduleAlert
            type="info"
            message={`${subjectName} - ${weekdayNames[(formData.weekday as number) - 1]}, Tiết ${formData.start_period}-${formData.end_period}`}
          />
        )}

        <FormRow>
          <FormGroup label="Môn học" required error={errors.subject_id}>
            <select
              className="form-group__select"
              value={formData.subject_id || ''}
              onChange={(e) => {
                setFormData({ ...formData, subject_id: parseInt(e.target.value) })
                setErrors({ ...errors, subject_id: '' })
              }}
            >
              <option value="">-- Chọn môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Thứ" required error={errors.weekday}>
            <select
              className="form-group__select"
              value={formData.weekday || ''}
              onChange={(e) => {
                setFormData({ ...formData, weekday: parseInt(e.target.value) })
                setErrors({ ...errors, weekday: '' })
              }}
            >
              <option value="">-- Chọn thứ --</option>
              {weekdayNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup label="Tiết bắt đầu" required error={errors.start_period}>
            <select
              className="form-group__select"
              value={formData.start_period || ''}
              onChange={(e) => {
                setFormData({ ...formData, start_period: parseInt(e.target.value) })
                setErrors({ ...errors, start_period: '' })
              }}
            >
              <option value="">-- Chọn tiết --</option>
              {periods.map((p) => (
                <option key={p.period_number} value={p.period_number}>
                  Tiết {p.period_number}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Tiết kết thúc" required error={errors.end_period}>
            <select
              className="form-group__select"
              value={formData.end_period || ''}
              onChange={(e) => {
                setFormData({ ...formData, end_period: parseInt(e.target.value) })
                setErrors({ ...errors, end_period: '' })
              }}
            >
              <option value="">-- Chọn tiết --</option>
              {periods.map((p) => (
                <option key={p.period_number} value={p.period_number}>
                  Tiết {p.period_number}
                </option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        <FormInput
          label="Phòng học"
          value={formData.room || ''}
          onChange={(e) => setFormData({ ...formData, room: e.target.value })}
          placeholder="Ví dụ: A101"
          helper="Tùy chọn"
        />

        <FormInput
          label="Ghi chú"
          value={formData.note || ''}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Thêm ghi chú..."
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

      {contextMenu && onContextMenuClose && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: 'Chỉnh sửa',
              icon: '✏️',
              onClick: () => {
                // Modal will open because schedule is already set
              },
            },
            {
              label: 'Xóa',
              icon: '🗑️',
              onClick: handleDelete,
              danger: true,
            },
          ]}
          onClose={onContextMenuClose}
        />
      )}
    </>
  )
}
