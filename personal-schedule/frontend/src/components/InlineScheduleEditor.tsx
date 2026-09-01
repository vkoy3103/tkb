import React, { useState, useEffect, useCallback } from 'react'
import {
  ScheduleModal,
  FormGroup,
  FormInput,
  FormRow,
  ScheduleToast,
  ContextMenu,
  ScheduleAlert,
} from './ScheduleEditor'
import { useAuth } from '../context/AuthContext'
import type { Schedule, Subject, Period } from '../types'

interface InlineScheduleEditorProps {
  schedule: Schedule | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Schedule>) => Promise<void>
  subjects: Subject[]
  periods: Period[]
  isLoading?: boolean
  contextMenu?: {
    x: number
    y: number
    onEdit: () => void
    onCancel: () => void
    onMakeup: () => void
  }
  onContextMenuClose?: () => void
}

export function InlineScheduleEditor({
  schedule,
  isOpen,
  onClose,
  onSave,
  subjects,
  periods,
  isLoading = false,
  contextMenu,
  onContextMenuClose,
}: InlineScheduleEditorProps): React.ReactElement | null {
  const { scheduleMode } = useAuth()
  const isTimeMode = scheduleMode === 'TIME'
  const [formData, setFormData] = useState<Partial<Schedule>>(
    schedule || {
      subject_id: 0,
      weekday: 2,
      start_period: 1,
      end_period: 2,
      start_time: '07:00',
      end_time: '09:00',
      room: '',
      note: '',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const resetForm = useCallback(() => {
    setFormData({
      subject_id: 0,
      weekday: 2,
      start_period: 1,
      end_period: 2,
      start_time: '07:00',
      end_time: '09:00',
      room: '',
      note: '',
    })
    setErrors({})
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (schedule) {
        setFormData(schedule)
      } else resetForm()
    }
  }, [schedule, isOpen, resetForm])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.subject_id) newErrors.subject_id = 'Vui lòng chọn môn học'
    if (!formData.weekday) newErrors.weekday = 'Vui lòng chọn thứ'
    if (isTimeMode) {
      if (!formData.start_time || !formData.end_time) {
        newErrors.start_time = 'Cần đủ giờ bắt đầu và kết thúc'
      } else if (formData.end_time <= formData.start_time) {
        newErrors.end_time = 'Giờ kết thúc phải sau giờ bắt đầu'
      }
    } else {
      if (!formData.start_period) newErrors.start_period = 'Vui lòng chọn tiết bắt đầu'
      if (!formData.end_period) newErrors.end_period = 'Vui lòng chọn tiết kết thúc'
      if (
        formData.start_period &&
        formData.end_period &&
        (formData.start_period as number) > (formData.end_period as number)
      ) {
        newErrors.end_period = 'Tiết kết thúc phải sau tiết bắt đầu'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    const payload = {
      ...formData,
      start_period: isTimeMode ? null : formData.start_period != null ? Number(formData.start_period) : null,
      end_period: isTimeMode ? null : formData.end_period != null ? Number(formData.end_period) : null,
      start_time: isTimeMode ? formData.start_time : null,
      end_time: isTimeMode ? formData.end_time : null,
    }

    try {
      await onSave(payload)
      onClose()
    } catch (error) {
      setToast({
        message: `Lỗi: ${(error as Error).message}`,
        type: 'error',
      })
    }
  }

  if (!isOpen && !toast && !contextMenu) {
    return null
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
      >
        {formData.subject_id && (
          <ScheduleAlert
            type="info"
            message={`${subjectName} - ${weekdayNames[(formData.weekday as number) - 2]}, ${
              isTimeMode
                ? `${formData.start_time} - ${formData.end_time}`
                : `Tiết ${formData.start_period}-${formData.end_period}`
            }`}
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
                <option key={idx + 2} value={idx + 2}>
                  {name}
                </option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        <FormRow>
          {isTimeMode ? (
            <>
              <FormGroup label="Giờ bắt đầu" required error={errors.start_time}>
                <input
                  type="time"
                  className="form-group__input"
                  value={formData.start_time || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, start_time: e.target.value })
                    setErrors({ ...errors, start_time: '' })
                  }}
                />
              </FormGroup>
              <FormGroup label="Giờ kết thúc" required error={errors.end_time}>
                <input
                  type="time"
                  className="form-group__input"
                  value={formData.end_time || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, end_time: e.target.value })
                    setErrors({ ...errors, end_time: '' })
                  }}
                />
              </FormGroup>
            </>
          ) : (
            <>
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
            </>
          )}
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
              onClick: contextMenu.onEdit,
            },
            {
              label: 'Nghỉ học',
              icon: '🚫',
              onClick: contextMenu.onCancel,
            },
            {
              label: 'Học bù',
              icon: '🔄',
              onClick: contextMenu.onMakeup,
            },
          ]}
          onClose={onContextMenuClose}
        />
      )}
    </>
  )
}
