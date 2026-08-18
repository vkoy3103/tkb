import type { Subject } from '../../types'
import { TIME_SLOTS, getTimeRow } from '../../utils/timeUtils'

type TimetableSchedule = {
  id: number | string
  subject_id: number
  weekday: number
  start_period: number
  end_period: number
  room?: string | null
  note?: string | null
  created_at?: string
  updated_at?: string
  _isWork?: boolean
  _isMakeup?: boolean
  shift_type?: string
  status?: string
}

type ScheduleOverride = {
  id: number
  class_schedule_id: number
  date: string
  type: 'cancel' | 'make_up' | 'reschedule' | string
  new_date?: string | null
  new_start_period?: number | null
  new_end_period?: number | null
  new_room?: string | null
  reason?: string | null
  note?: string | null
}

type DayColumnProps = {
  date: string
  schedules?: TimetableSchedule[]
  subjects?: Subject[]
  periods?: {
    period_number: number
    start_time: string
    end_time: string
  }[]
  scheduleOverrides?: ScheduleOverride[]
  onCancel?: (schedule: TimetableSchedule, date: string) => void
  onScheduleClick?: (schedule: TimetableSchedule, date: string) => void
  onScheduleContextMenu?: (e: React.MouseEvent, schedule: TimetableSchedule, date: string) => void
}

export function DayColumn({
  date,
  schedules = [],
  subjects = [],
  periods = [],
  scheduleOverrides = [],
  onScheduleClick,
  onScheduleContextMenu,
}: DayColumnProps) {
  return (
    <div className="timetable-day-column">
      <div
        className="timetable-day-grid"
        style={{
          gridTemplateRows: `repeat(${TIME_SLOTS.length}, var(--timetable-row-height))`,
        }}
      >
        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="timetable-grid-cell" />
        ))}

        {schedules.map((schedule) => {
          const subject = subjects.find(
            (item) => item.id === schedule.subject_id,
          )

          const isWork = '_isWork' in schedule && Boolean(schedule._isWork)

          let startTime: string, endTime: string

          if (isWork && schedule.note) {
            ;[startTime, endTime] = schedule.note.split('-')
            startTime = startTime.slice(0, 5)
            endTime = endTime.slice(0, 5)
          } else {
            const startPeriod = periods.find(
              (period) => period.period_number === schedule.start_period,
            )
            const endPeriod = periods.find(
              (period) => period.period_number === schedule.end_period,
            )
            startTime =
              startPeriod?.start_time.slice(0, 5) ??
              `${schedule.start_period}:00`
            endTime =
              endPeriod?.end_time.slice(0, 5) ??
              `${schedule.end_period}:00`
          }

          // Định vị ô trên grid tiết học
          let startIndex: number
          let endIndex: number

          if (isWork) {
            // Ca làm theo giờ -> dùng getTimeRow để định vị trên grid tiết học
            startIndex = getTimeRow(startTime) - 1
            endIndex = Math.max(getTimeRow(endTime) - 1, startIndex + 1)
          } else {
            // Lịch học theo tiết -> khớp chính xác với TIME_SLOTS
            const findClosestSlot = (time: string) => {
              const [h, m] = time.split(':').map(Number)
              const roundedM = m < 30 ? '00' : '30'
              return `${String(h).padStart(2, '0')}:${roundedM}`
            }

            startIndex = TIME_SLOTS.findIndex((slot) => slot === findClosestSlot(startTime))
            endIndex = TIME_SLOTS.findIndex((slot) => slot === endTime)
          }

          const span = Math.max(1, endIndex - startIndex)

          const rowStart = startIndex >= 0 ? startIndex + 1 : 1

          const isMakeup =
            '_isMakeup' in schedule && Boolean(schedule._isMakeup)

          /*
           * Quan trọng:
           * cancel phải kiểm tra cả class_schedule_id và date.
           */
          const cancelOverride = scheduleOverrides.find(
            (override) =>
              override.type === 'cancel' &&
              Number(override.class_schedule_id) === Number(schedule.id) &&
              override.date === date,
          )

          const isCancelled = Boolean(cancelOverride)

          return (
            <div
              key={`${schedule.id}-${date}`}
              className={`timetable-lesson-block cursor-pointer ${isWork ? 'timetable-lesson-block--work' : ''} ${isMakeup ? 'timetable-lesson-block--makeup' : ''} ${isCancelled ? 'timetable-lesson-block--cancelled' : ''}`}
              style={{
                gridRow: `${rowStart} / span ${span}`,
                background: isCancelled
                  ? '#fef2f2'
                  : isWork
                    ? '#f5f3ff' // bg-violet-50
                    : isMakeup
                      ? '#ecfeff' // bg-cyan-50
                      : subject?.color
                        ? `${subject.color}ee`
                        : '#dbeafe', // bg-blue-200
                borderColor: isCancelled
                  ? '#ef4444'
                  : isWork
                    ? '#8b5cf6' // border-violet-500
                    : isMakeup
                      ? '#22c55e' // border-green-500
                      : subject?.color
                        ? `${subject.color}99`
                        : '#93c5fd', // border-blue-300
              }}
              onClick={() => {
                if (onScheduleClick) {
                  onScheduleClick(schedule, date)
                }
              }}
              onContextMenu={(e) => {
                onScheduleContextMenu?.(e, schedule, date)
              }}
            >
              {isCancelled ? (
                <>
                  <div className="timetable-lesson-block__title">
                    {subject?.name ?? 'Môn học'}
                  </div>

                  <div className="timetable-lesson-block__meta">
                    {startTime} - {endTime}
                  </div>

                  <div className="timetable-lesson-block__meta">
                    ❌ ĐÃ NGHỈ
                  </div>
                </>
              ) : (
                <>
                  <div className="timetable-lesson-block__title">
                    {isWork
                      ? `Ca làm${schedule.shift_type ? ` · ${schedule.shift_type}` : ''}`
                      : `${subject?.name ?? 'Môn học'} ${isMakeup ? ' • Học bù' : ''}`}
                  </div>

                  <div className="timetable-lesson-block__meta">
                    {startTime} - {endTime}
                  </div>

                  <div className="timetable-lesson-block__meta">
                    {isWork
                      ? schedule.status === 'done'
                        ? '✓ Đã làm'
                        : schedule.status === 'cancelled'
                          ? '✕ Đã hủy'
                          : 'Theo lịch'
                      : schedule.room || 'Không có phòng'}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}