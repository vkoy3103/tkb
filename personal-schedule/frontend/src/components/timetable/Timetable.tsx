import { useMemo, useState } from 'react'
import { DayColumn } from './DayColumn'
import { SubjectSidebar } from './SubjectSidebar'
import { TimeColumn } from './TimeColumn'
import type { Period, Schedule, ScheduleOverride, SettingsEntry, Subject, WorkExtra, WorkShift } from '../../types'
import { settingsToRates } from '../../utils/salary'
import { calcShiftMoney, getOtStartMinutes } from '../../utils/workMoney'
import { getStudyWeek, getSubjectEffectiveWeekRange, isRangeActiveInWeek, isScheduleInWeek } from '../../utils/studyWeek'
import '../../styles/timetable.css'

export type TimetableSchedule = {
  id: number | string
  subject_id: number
  weekday: number
  start_period: number | null
  end_period: number | null
  start_time?: string | null
  end_time?: string | null
  room?: string | null
  note?: string | null
  created_at?: string
  updated_at?: string
  _isWork?: boolean
  _isMakeup?: boolean
  shift_type?: string
  status?: string
  // Số tiền của ca làm (tính từ settings) — hiển thị trên thời khóa biểu
  _amount?: number
  // Ngày cụ thể cho sự kiện 1 lần (ca làm / học bù), định dạng YYYY-MM-DD
  date?: string
}

const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
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
  // Lấy ngày theo local (tránh toISOString làm lệch ngày do múi giờ)
  const vietnamDate = getVietnamDate(date)
  const y = vietnamDate.getFullYear()
  const m = String(vietnamDate.getMonth() + 1).padStart(2, '0')
  const d = String(vietnamDate.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type TimetableProps = {
  subjects: Subject[]
  schedules: Schedule[]
  periods: Period[]
  scheduleOverrides?: ScheduleOverride[]
  workShifts?: WorkShift[]
  workExtras?: WorkExtra[]
  settings?: SettingsEntry[]
  onScheduleClick?: (schedule: TimetableSchedule, date: string) => void
  onScheduleContextMenu?: (e: React.MouseEvent, schedule: TimetableSchedule, date: string) => void
  onAddSchedule?: () => void
  onAddWorkShiftWeek?: () => void
  onUpdateSubject?: (id: number, data: Partial<Subject>) => void | Promise<void>
  onDeleteSubject?: (id: number) => void | Promise<void>
  onUpdateSchedule?: (scheduleId: number, data: Partial<Schedule>) => void | Promise<void>
}

export function Timetable({
  subjects = [],
  schedules = [],
  periods = [],
  scheduleOverrides = [],
  workShifts = [],
  workExtras = [],
  settings = [],
  onScheduleClick,
  onScheduleContextMenu,
  onAddSchedule,
  onAddWorkShiftWeek,
  onUpdateSubject,
  onDeleteSubject,
  onUpdateSchedule,
}: TimetableProps) {
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

  // Tuần học đang hiển thị (tuần 1 bắt đầu từ 10/08)
  const studyWeek = useMemo(() => getStudyWeek(weekDates[0]), [weekDates])

  const subjectsById = useMemo(() => {
    const map = new Map<number, Subject>()
    subjects.forEach((subject) => map.set(subject.id, subject))
    return map
  }, [subjects])

  // Lịch cố định có hiển thị trong tuần này không? Dùng phạm vi tuần của MÔN (ưu tiên), fallback theo tuần schedule
  const isScheduleVisible = (item: Schedule) => {
    const subject = subjectsById.get(item.subject_id)
    if (subject) {
      return isRangeActiveInWeek(getSubjectEffectiveWeekRange(subject, schedules), studyWeek)
    }
    return isScheduleInWeek(item, studyWeek)
  }

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
          date: targetDate,
          _isMakeup: true,
        }
      })
  }, [scheduleOverrides, schedules])

  const workEvents = useMemo<TimetableSchedule[]>(() => {
    const rates = settingsToRates(settings)
    const otStart = getOtStartMinutes(settings)
    const extrasByShift = new Map<number, WorkExtra[]>()
    workExtras.forEach((extra) => {
      const list = extrasByShift.get(extra.work_shift_id) ?? []
      list.push(extra)
      extrasByShift.set(extra.work_shift_id, list)
    })

    return workShifts.map((shift) => {
      const date = new Date(`${shift.date}T00:00:00`)
      const jsDay = date.getDay()
      const weekday = jsDay === 0 ? 8 : jsDay + 1
      const money = calcShiftMoney(shift, extrasByShift.get(shift.id) ?? [], rates, otStart)

      return {
        id: `work-${shift.id}`,
        subject_id: -1, // Special ID for work
        weekday,
        start_period: 0, // Work shifts use time, not periods
        end_period: 0,
        note: `${shift.scheduled_start}-${shift.scheduled_end}`,
        shift_type: shift.shift_type,
        status: shift.status,
        date: shift.date,
        _isWork: true,
        _amount: money.total,
      }
    })
  }, [workShifts, workExtras, settings])

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

        <div className="timetable-toolbar__actions">
          <button type="button" onClick={onAddSchedule} className="timetable-toolbar__button timetable-toolbar__button--primary">
            + Thêm lịch
          </button>
          <button type="button" onClick={onAddWorkShiftWeek} className="timetable-toolbar__button">
            🗓️ Thêm ca theo tuần
          </button>
        </div>
      </div>

      <div className="timetable-layout">
        <SubjectSidebar
          subjects={subjects}
          schedules={schedules}
          studyWeek={studyWeek}
          onUpdateSubject={onUpdateSubject}
          onDeleteSubject={onDeleteSubject}
          onUpdateSchedule={onUpdateSchedule}
        />

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
                  // Lịch học cố định: lặp theo thứ + lọc theo tuần học đang hiển thị; ca làm & học bù: chỉ đúng ngày cụ thể
                  const daySchedules: TimetableSchedule[] = [
                    ...schedules.filter((item) => item.weekday === weekdayValue && isScheduleVisible(item)),
                    ...makeupSchedules.filter((item) => item.weekday === weekdayValue && item.date === iso),
                    ...workEvents.filter((item) => item.weekday === weekdayValue && item.date === iso),
                  ]

                  return (
                    <DayColumn
                      key={iso}
                      date={iso}
                      schedules={daySchedules}
                      subjects={subjects}
                      periods={periods}
                      scheduleOverrides={scheduleOverrides}
                      onScheduleClick={onScheduleClick}
                      onScheduleContextMenu={onScheduleContextMenu}
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
