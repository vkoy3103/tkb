import type { Subject } from '../../types'
import { TIME_SLOTS } from '../../utils/timeUtils'

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
  _isMakeup?: boolean
}

type DayColumnProps = {
  schedules?: TimetableSchedule[]
  subjects?: Subject[]
  periods?: { period_number: number; start_time: string; end_time: string }[]
}

export function DayColumn({ schedules = [], subjects = [], periods = [] }: DayColumnProps) {
  return (
    <div className="timetable-day-column">
      <div className="timetable-day-grid" style={{ gridTemplateRows: `repeat(${TIME_SLOTS.length}, var(--timetable-row-height))` }}>
        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="timetable-grid-cell" />
        ))}

        {schedules.map((schedule) => {
          const subject = subjects.find((item) => item.id === schedule.subject_id)
          const startPeriod = periods.find((period) => period.period_number === schedule.start_period)
          const endPeriod = periods.find((period) => period.period_number === schedule.end_period)
          const startTime = startPeriod?.start_time.slice(0, 5) ?? `${schedule.start_period}:00`
          const endTime = endPeriod?.end_time.slice(0, 5) ?? `${schedule.end_period}:00`
          const startIndex = TIME_SLOTS.findIndex((slot) => slot === startTime)
          const endIndex = TIME_SLOTS.findIndex((slot) => slot === endTime)
          const span = Math.max(1, endIndex - startIndex)
          const rowStart = startIndex >= 0 ? startIndex + 1 : 1
          const isMakeup = '_isMakeup' in schedule && Boolean(schedule._isMakeup)

          return (
            <div
              key={String(schedule.id)}
              className={`timetable-lesson-block ${isMakeup ? 'timetable-lesson-block--makeup' : ''}`}
              style={{
                gridRow: `${rowStart} / span ${span}`,
                background: isMakeup ? '#ecfeff' : subject?.color ? `${subject.color}ee` : '#dbeafe',
                borderColor: isMakeup ? '#22c55e' : subject?.color ? `${subject.color}99` : '#93c5fd',
              }}
            >
              <div className="timetable-lesson-block__title">{subject?.name ?? 'Môn học'}{isMakeup ? ' • Học bù' : ''}</div>
              <div className="timetable-lesson-block__meta">{startTime} - {endTime}</div>
              <div className="timetable-lesson-block__meta">{schedule.room || 'Không có phòng'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
