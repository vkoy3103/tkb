import { useMemo, useState } from 'react'
import { DayColumn } from './DayColumn'
import { SubjectSidebar } from './SubjectSidebar'
import { TimeColumn } from './TimeColumn'
import type { Period, Schedule, ScheduleOverride, Subject } from '../../types'
import '../../styles/timetable.css'

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

const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const weekdayLabelMap: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
}
const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh'

function getVietnamDate(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))

  return new Date(`${map.year}-${map.month}-${map.day}T00:00:00`)
}

function startOfVietnamWeek(date: Date) {
  const d = getVietnamDate(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (day - 1))
  return d
}

function formatDateKey(date: Date) {
  const vietnamDate = getVietnamDate(date)
  return vietnamDate.toISOString().slice(0, 10)
}

type TimetableProps = {
  subjects: Subject[]
  schedules: Schedule[]
  periods: Period[]
  scheduleOverrides?: ScheduleOverride[]
}

export function Timetable({ subjects, schedules, periods, scheduleOverrides = [] }: TimetableProps) {
  const [viewDate, setViewDate] = useState(() => getVietnamDate(new Date()))

  const weekDates = useMemo(() => {
    const start = startOfVietnamWeek(viewDate)
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start)
      d.setDate(start.getDate() + index)
      return d
    })
  }, [viewDate])

  const weekLabel = useMemo(() => {
    const start = weekDates[0]
    const end = weekDates[6]
    return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }, [weekDates])

  const canceledScheduleIds = useMemo(
    () => new Set(scheduleOverrides.filter((item) => item.type === 'cancel').map((item) => item.class_schedule_id)),
    [scheduleOverrides],
  )

  const visibleSchedules = useMemo(
    () => schedules.filter((schedule) => !canceledScheduleIds.has(schedule.id)),
    [canceledScheduleIds, schedules],
  )

  const makeupSchedules = useMemo<TimetableSchedule[]>(() => {
    return scheduleOverrides
      .filter((override) => override.type === 'make_up')
      .map((override) => {
        const sourceSchedule = schedules.find((item) => item.id === override.class_schedule_id)
        const targetDate = override.new_date || override.date
        const date = new Date(`${targetDate}T00:00:00`)
        const jsDay = date.getDay()
        const weekday = jsDay === 0 ? 8 : jsDay + 1

        return {
          id: `makeup-${override.id}`,
          subject_id: sourceSchedule?.subject_id ?? 0,
          weekday,
          start_period: override.new_start_period ?? sourceSchedule?.start_period ?? 1,
          end_period: override.new_end_period ?? sourceSchedule?.end_period ?? 1,
          room: override.new_room ?? sourceSchedule?.room ?? null,
          note: override.reason ?? null,
          created_at: override.created_at,
          updated_at: override.updated_at,
          _isMakeup: true,
        }
      })
  }, [scheduleOverrides, schedules])

  return (
    <div className="timetable-shell">
      <div className="timetable-toolbar">
        <div className="timetable-toolbar__nav">
          <button type="button" onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))} className="timetable-toolbar__button">Previous</button>
          <button type="button" onClick={() => setViewDate(() => getVietnamDate(new Date()))} className="timetable-toolbar__button">Today</button>
          <button type="button" onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))} className="timetable-toolbar__button">Next</button>
        </div>

        <div className="timetable-toolbar__summary">
          <p className="timetable-toolbar__label">Week</p>
          <p className="timetable-toolbar__date">{weekLabel}</p>
        </div>
      </div>

      <div className="timetable-layout">
        <SubjectSidebar subjects={subjects} />

        <div className="timetable-board">
          <div className="timetable-scroll">
            <div className="timetable-grid">
              <div className="timetable-header-row">
                <div className="timetable-header-corner" />
                {weekDates.map((date, index) => {
                  const iso = formatDateKey(date)
                  const isToday = iso === formatDateKey(getVietnamDate(new Date()))

                  return (
                    <div key={iso} className={`timetable-day-header ${isToday ? 'timetable-day-header--today' : ''}`}>
                      <div className="timetable-day-label">{dayNames[index]}</div>
                      <div className={`timetable-day-badge ${isToday ? 'timetable-day-badge--today' : ''}`}>
                        {`${date.getDate()}/${date.getMonth() + 1}`}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="timetable-body-row">
                <TimeColumn />
                {weekDates.map((date, index) => {
                  const iso = formatDateKey(date)
                  const weekdayValue = index + 2
                  const daySchedules: TimetableSchedule[] = [
                    ...visibleSchedules.filter((item) => item.weekday === weekdayValue),
                    ...makeupSchedules.filter((item) => item.weekday === weekdayValue),
                  ]

                  return (
                    <DayColumn
                      key={iso}
                      schedules={daySchedules}
                      subjects={subjects}
                      periods={periods}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
