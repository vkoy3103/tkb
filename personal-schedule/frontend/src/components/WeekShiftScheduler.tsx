import React, { useEffect, useMemo, useState } from 'react'
import {
  ScheduleModal,
  FormGroup,
  ScheduleToast,
} from './ScheduleEditor'
import { fetchSchedules } from '../services/scheduleApi'
import { fetchPeriods } from '../services/periodApi'
import { fetchScheduleOverrides } from '../services/scheduleOverrideApi'
import { fetchWorkShifts } from '../services/workShiftApi'
import type { Period, Schedule, ScheduleOverride, WorkShift } from '../types'
import '../styles/week-shift-scheduler.css'

// 3 ca cố định mỗi ngày
const SHIFT_SLOTS = [
  { name: 'SHIFT 1', start: '09:00', end: '13:00' },
  { name: 'SHIFT 2', start: '13:00', end: '18:00' },
  { name: 'SHIFT 3', start: '18:00', end: '22:00' },
]

// Quy ước weekday theo DB: 2 = Thứ 2 ... 8 = Chủ nhật
const WEEKDAY_LABELS = [
  { weekday: 2, label: 'Thứ 2' },
  { weekday: 3, label: 'Thứ 3' },
  { weekday: 4, label: 'Thứ 4' },
  { weekday: 5, label: 'Thứ 5' },
  { weekday: 6, label: 'Thứ 6' },
  { weekday: 7, label: 'Thứ 7' },
  { weekday: 8, label: 'Chủ nhật' },
]

export interface WeekShiftDraft {
  date: string
  shift_type: string
  scheduled_start: string
  scheduled_end: string
  status: string
}

interface WeekShiftSchedulerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (toCreate: WeekShiftDraft[], toDeleteIds: number[]) => Promise<void>
  isLoading?: boolean
}

function toMinutes(t?: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Trả về thứ 2 (đầu tuần) của tuần chứa ngày đã cho
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() === 0 ? 7 : d.getDay() // CN=7 ... T7=6
  d.setDate(d.getDate() - (day - 1))
  return d
}

function formatShort(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export function WeekShiftScheduler({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: WeekShiftSchedulerProps): React.ReactElement | null {
  const [weekStart, setWeekStart] = useState(() => formatYMD(getMondayOfWeek(new Date())))
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [existingMap, setExistingMap] = useState<Record<string, WorkShift>>({})
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  // Khi mở modal: reset về tuần hiện tại
  useEffect(() => {
    if (!isOpen) return
    setWeekStart(formatYMD(getMondayOfWeek(new Date())))
    setErrors({})
    setToast(null)
    setLoadError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Tải lịch học + ca làm hiện có của tuần đang chọn
  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      setLoadingData(true)
      try {
        const [scheduleData, periodData, shiftData, overrideData] = await Promise.all([
          fetchSchedules(),
          fetchPeriods(),
          fetchWorkShifts(),
          fetchScheduleOverrides(),
        ])
        setSchedules(scheduleData)
        setPeriods(periodData)
        setScheduleOverrides(overrideData)

        // Khớp ca làm hiện có với ô (ngày + ca) trong tuần
        const startDate = new Date(`${weekStart}T00:00:00`)
        const endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        const map: Record<string, WorkShift> = {}
        const initial: Record<string, boolean> = {}
        shiftData.forEach((shift) => {
          const d = new Date(`${shift.date}T00:00:00`)
          if (d < startDate || d > endDate) return
          const jsDay = d.getDay()
          const weekday = jsDay === 0 ? 8 : jsDay + 1
          const slotIndex = SHIFT_SLOTS.findIndex(
            (slot) =>
              slot.start === (shift.scheduled_start || '').slice(0, 5) &&
              slot.end === (shift.scheduled_end || '').slice(0, 5),
          )
          if (slotIndex === -1) return
          const key = `${weekday}-${slotIndex}`
          map[key] = shift
          initial[key] = true
        })
        setExistingMap(map)
        setSelected(initial)
      } catch {
        setLoadError('Không thể tải dữ liệu.')
      } finally {
        setLoadingData(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, weekStart])

  // Ma trận trùng lịch học: key `${weekday}-${slotIndex}` -> true nếu ca trùng giờ học.
  // Nếu lịch học bị NGHỈ hôm đó (override type='cancel' đúng ngày) thì KHÔNG tính là trùng
  // (môn đã nghỉ nên có thể đăng ký ca làm vào khung giờ đó).
  const conflictMap = useMemo(() => {
    const map: Record<string, boolean> = {}

    // Ngày cụ thể của từng thứ trong tuần đang xem (để khớp override nghỉ theo ngày)
    const dayDate = (weekday: number): string => {
      const start = new Date(`${weekStart}T00:00:00`)
      const d = new Date(start)
      d.setDate(start.getDate() + (weekday - 2))
      return formatYMD(d)
    }

    for (const day of WEEKDAY_LABELS) {
      const date = dayDate(day.weekday)
      const classRanges = schedules
        .filter((s) => {
          if (s.weekday !== day.weekday) return false
          // Lịch bị nghỉ đúng hôm đó → bỏ qua (không chặn ca làm)
          const cancelled = scheduleOverrides.some(
            (o) => o.type === 'cancel' && Number(o.class_schedule_id) === Number(s.id) && o.date === date,
          )
          return !cancelled
        })
        .map((s) => {
          const sp = periods.find((p) => p.period_number === s.start_period)
          const ep = periods.find((p) => p.period_number === s.end_period)
          if (!sp || !ep) return null
          const start = toMinutes(sp.start_time)
          const end = toMinutes(ep.end_time)
          if (start == null || end == null) return null
          return { start, end }
        })
        .filter(Boolean) as { start: number; end: number }[]

      SHIFT_SLOTS.forEach((slot, index) => {
        const slotStart = toMinutes(slot.start)
        const slotEnd = toMinutes(slot.end)
        if (slotStart == null || slotEnd == null) return
        const conflicted = classRanges.some((r) => slotStart < r.end && slotEnd > r.start)
        if (conflicted) map[`${day.weekday}-${index}`] = true
      })
    }
    return map
  }, [schedules, periods, scheduleOverrides, weekStart])

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])
  const existingCount = useMemo(
    () => Object.keys(existingMap).filter((key) => selected[key]).length,
    [existingMap, selected],
  )
  const newCount = useMemo(() => selectedCount - existingCount, [selectedCount, existingCount])
  const deleteCount = useMemo(
    () => Object.keys(existingMap).filter((key) => !selected[key]).length,
    [existingMap, selected],
  )

  const weekDays = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00`)
    return WEEKDAY_LABELS.map((day) => {
      const d = new Date(start)
      d.setDate(start.getDate() + (day.weekday - 2))
      return { ...day, date: formatYMD(d) }
    })
  }, [weekStart])

  const weekEnd = useMemo(() => {
    const d = new Date(`${weekStart}T00:00:00`)
    d.setDate(d.getDate() + 6)
    return d
  }, [weekStart])

  const shiftWeek = (offset: number) => {
    const d = new Date(`${weekStart}T00:00:00`)
    d.setDate(d.getDate() + offset * 7)
    setWeekStart(formatYMD(d))
  }

  const handlePickWeek = (value: string) => {
    if (!value) return
    setWeekStart(formatYMD(getMondayOfWeek(new Date(`${value}T00:00:00`))))
  }

  const toggle = (dayWeekday: number, slotIndex: number) => {
    const key = `${dayWeekday}-${slotIndex}`
    if (conflictMap[key]) return // ca trùng lịch học -> không chọn được
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectAll = () => {
    const next: Record<string, boolean> = {}
    for (const day of WEEKDAY_LABELS) {
      SHIFT_SLOTS.forEach((_, index) => {
        const key = `${day.weekday}-${index}`
        if (!conflictMap[key]) next[key] = true
      })
    }
    setSelected(next)
  }

  const clearAll = () => setSelected({})

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const toCreate: WeekShiftDraft[] = []
    const toDeleteIds: number[] = []
    for (const day of weekDays) {
      SHIFT_SLOTS.forEach((slot, index) => {
        const key = `${day.weekday}-${index}`
        const isSelected = !!selected[key]
        const existing = existingMap[key]
        if (isSelected && !existing) {
          toCreate.push({
            date: day.date,
            shift_type: slot.name,
            scheduled_start: slot.start,
            scheduled_end: slot.end,
            status: 'scheduled',
          })
        } else if (!isSelected && existing) {
          toDeleteIds.push(existing.id)
        }
      })
    }

    if (toCreate.length === 0 && toDeleteIds.length === 0) {
      setErrors({ form: 'Không có thay đổi nào. Hãy tick ca mới hoặc bỏ tick ca đã có.' })
      return
    }

    try {
      await onSave(toCreate, toDeleteIds)
      const parts: string[] = []
      if (toCreate.length > 0) parts.push(`thêm ${toCreate.length} ca`)
      if (toDeleteIds.length > 0) parts.push(`xóa ${toDeleteIds.length} ca`)
      onClose()
    } catch (error) {
      setToast({ message: `Lỗi: ${(error as Error).message}`, type: 'error' })
    }
  }

  return (
    <>
      <ScheduleModal
        isOpen={isOpen}
        title="Thêm ca làm theo tuần"
        onClose={onClose}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Lưu ca làm"
        closeLabel="Hủy"
        modalClassName="schedule-modal--wide"
      >
        {/* Chọn tuần */}
        <FormGroup label="Tuần làm việc" required helper="Lịch chỉ áp dụng cho tuần này, không lặp lại tuần sau">
          <div className="ws-week-nav">
            <button type="button" onClick={() => shiftWeek(-1)} className="ws-btn">
              ‹ Tuần trước
            </button>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => handlePickWeek(e.target.value)}
              className="form-group__input"
            />
            <button type="button" onClick={() => shiftWeek(1)} className="ws-btn">
              Tuần sau ›
            </button>
          </div>
          <div className="ws-summary">
            <span className="ws-chip">
              🗓 {formatShort(new Date(`${weekStart}T00:00:00`))} – {formatShort(weekEnd)}
            </span>
            <span className="ws-chip ws-chip--ok">{selectedCount} ca chọn</span>
            <span className="ws-chip">{existingCount} đã có</span>
            <span className="ws-chip">{newCount} mới</span>
            <span className={`ws-chip ${deleteCount > 0 ? 'ws-chip--danger' : ''}`}>
              {deleteCount > 0 ? `✕ ${deleteCount} sẽ xóa` : 'không xóa'}
            </span>
          </div>
        </FormGroup>

        {loadError && (
          <div className="schedule-alert schedule-alert--error" style={{ marginBottom: 8 }}>
            {loadError}
          </div>
        )}
        {errors.form && <div className="form-group__error">{errors.form}</div>}

        {/* Bảng chọn ca theo ngày */}
        {loadingData ? (
          <div style={{ padding: 14, color: '#64748b', fontSize: 13 }}>Đang tải lịch học để kiểm tra trùng...</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 4 }}>
            <table className="ws-table">
              <thead>
                <tr>
                  <th className="ws-shift-cell" style={{ textAlign: 'left' }}>Ca \ Ngày</th>
                  {weekDays.map((day) => (
                    <th key={day.weekday} className="ws-th-day">
                      <div className="ws-day-name">{day.label}</div>
                      <div className="ws-day-date">{formatShort(new Date(`${day.date}T00:00:00`))}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFT_SLOTS.map((slot, slotIndex) => (
                  <tr key={slot.name}>
                    <td className="ws-shift-cell">
                      <div className="ws-shift-name">{slot.name}</div>
                      <div className="ws-shift-time">{slot.start}–{slot.end}</div>
                    </td>
                    {weekDays.map((day) => {
                      const key = `${day.weekday}-${slotIndex}`
                      const conflicted = !!conflictMap[key]
                      const checked = !!selected[key]
                      const existing = existingMap[key]
                      const status = conflicted
                        ? { cls: 'ws-status--conflict', text: 'Trùng' }
                        : checked && existing
                          ? { cls: 'ws-status--existing', text: '✓ Có' }
                          : checked
                            ? { cls: 'ws-status--new', text: '✓ Mới' }
                            : existing
                              ? { cls: 'ws-status--delete', text: '✕ Xóa' }
                              : { cls: 'ws-status--empty', text: 'Trống' }
                      return (
                        <td key={key} style={{ padding: '2px 3px' }}>
                          <label
                            className={`ws-cell ${conflicted ? 'ws-cell--disabled' : 'ws-cell--clickable'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={conflicted}
                              onChange={() => toggle(day.weekday, slotIndex)}
                            />
                            <span className={`ws-status ${status.cls}`}>{status.text}</span>
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="ws-legend">
          <span className="ws-legend-item"><span className="ws-dot ws-dot--existing" /> Đã có</span>
          <span className="ws-legend-item"><span className="ws-dot ws-dot--new" /> Mới</span>
          <span className="ws-legend-item"><span className="ws-dot ws-dot--delete" /> Sẽ xóa</span>
          <span className="ws-legend-item"><span className="ws-dot ws-dot--conflict" /> Trùng lịch học</span>
        </div>

        <p className="ws-tip">
          💡 Bỏ tick một ca <strong>đã có</strong> sẽ <strong>xóa</strong> ca đó khỏi tuần khi nhấn "Lưu ca làm".
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={selectAll} className="ws-btn ws-btn--select-all">
            ✓ Chọn tất cả
          </button>
          <button type="button" onClick={clearAll} className="ws-btn ws-btn--clear">
            ✕ Bỏ chọn
          </button>
        </div>
      </ScheduleModal>

      {toast && <ScheduleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
