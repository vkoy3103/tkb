import { useMemo, useState } from 'react'
import { DayColumn } from './DayColumn'
import { SubjectSidebar } from './SubjectSidebar'
import { TimeColumn } from './TimeColumn'
import type { Period, Schedule, ScheduleOverride, SettingsEntry, Subject, WorkExtra, WorkShift } from '../../types'
import { settingsToRates } from '../../utils/salary'
import { calcShiftMoney, getOtStartMinutes } from '../../utils/workMoney'
import { buildTimeSlots, minutesToTime, timeToMinutes } from '../../utils/timeUtils'
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
  // Note cơ sở của ca làm (vd "CƠ SỞ 1: 377 NGÔ QUYỀN") + màu phân biệt theo cơ sở
  _baseNote?: string | null
  _baseColor?: { bg: string; border: string } | null
}

// Palette màu cho từng cơ sở — giúp dễ nhận biết ca làm ở cơ sở nào.
// 2 cơ sở đầu được chọn tương phản rõ (tím ↔ cam) để dễ phân biệt nhất.
const BASE_COLORS = [
  { bg: '#ede9fe', border: '#7c3aed' }, // tím
  { bg: '#ffedd5', border: '#ea580c' }, // cam
  { bg: '#dcfce7', border: '#16a34a' }, // xanh lá
  { bg: '#dbeafe', border: '#2563eb' }, // xanh dương
  { bg: '#fce7f3', border: '#db2777' }, // hồng
  { bg: '#fef9c3', border: '#ca8a04' }, // vàng
  { bg: '#ccfbf1', border: '#0d9488' }, // teal
  { bg: '#f3e8ff', border: '#9333ea' }, // tím đậm
]

/** Chọn màu theo tên cơ sở: "CƠ SỞ 1: ..." → màu index 0, "CƠ SỞ 2: ..." → index 1... */
function getBaseColor(note?: string | null): { bg: string; border: string } | null {
  const key = note?.trim() || ''
  if (!key) return null
  const match = key.match(/cơ\s*sở\s*(\d+)/i)
  if (match) {
    return BASE_COLORS[(Number(match[1]) - 1) % BASE_COLORS.length]
  }
  // Cơ sở không có số — hash tên để ra màu ổn định
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return BASE_COLORS[hash % BASE_COLORS.length]
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

// "2026-08-17" -> "17/08" cho panel cảnh báo
function formatDayLabel(dateKey: string) {
  const [, m, d] = dateKey.split('-')
  return `${d}/${m}`
}

type TimetableProps = {
  subjects: Subject[]
  schedules: Schedule[]
  periods: Period[]
  scheduleOverrides?: ScheduleOverride[]
  workShifts?: WorkShift[]
  workExtras?: WorkExtra[]
  settings?: SettingsEntry[]
  scheduleMode?: 'PERIOD' | 'TIME'
  onScheduleClick?: (schedule: TimetableSchedule, date: string) => void
  onScheduleContextMenu?: (e: React.MouseEvent, schedule: TimetableSchedule, date: string) => void
  onAddSchedule?: () => void
  onAddWorkShiftWeek?: () => void
  // Thêm ca làm vào ô lịch học đã bị nghỉ (date + giờ được điền sẵn)
  onAddWorkShiftFromCancel?: (info: {
    schedule: TimetableSchedule
    date: string
    start: string
    end: string
  }) => void
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
  scheduleMode = 'TIME',
  onScheduleClick,
  onScheduleContextMenu,
  onAddSchedule,
  onAddWorkShiftWeek,
  onAddWorkShiftFromCancel,
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
        _baseNote: shift.note ?? null,
        _baseColor: getBaseColor(shift.note),
      }
    })
  }, [workShifts, workExtras, settings])

  // Mốc giờ ĐỘNG: PERIOD mode giữ mốc :30 (từ tiết học) để lịch theo tiết khớp đúng vị trí;
  // TIME mode dùng giờ tròn 07:00→22:00 + tự sinh hàng cho giờ lẻ (vd 13:15, 14:30...)
  const timeSlots = useMemo(() => {
    const extraTimes: string[] = []
    workShifts.forEach((shift) => {
      if (shift.scheduled_start) extraTimes.push(shift.scheduled_start)
      if (shift.scheduled_end) extraTimes.push(shift.scheduled_end)
      if (shift.actual_start) extraTimes.push(shift.actual_start)
      if (shift.actual_end) extraTimes.push(shift.actual_end)
    })
    schedules.forEach((item) => {
      if (item.start_time) extraTimes.push(item.start_time)
      if (item.end_time) extraTimes.push(item.end_time)
    })
    return buildTimeSlots(extraTimes, scheduleMode)
  }, [workShifts, schedules, scheduleMode])

  // ----- Phát hiện xung đột (lịch đè lên nhau) -----
  // Quy đổi tiết học → giờ theo periods (dùng chung cho cả PERIOD và TIME)
  const periodsByNumber = useMemo(() => {
    const map = new Map<number, { start: number; end: number }>()
    periods.forEach((p) => {
      map.set(p.period_number, {
        start: timeToMinutes(p.start_time),
        end: timeToMinutes(p.end_time),
      })
    })
    return map
  }, [periods])

  // Map lịch cố định (Schedule) sang dạng có id chuẩn để so khớp với DayColumn
  const fixedSchedules = useMemo(
    () => schedules.filter((item) => isScheduleVisible(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedules, studyWeek],
  )

  interface ConflictInfo {
    key: string // `${date}::${id}` để DayColumn tô đỏ
    date: string
    start: number
    end: number
    label: string
    sub: string
  }

  // Kết quả: các key bị đè (để tô đỏ) + cặp xung đột (để hiện panel)
  const conflicts = useMemo(() => {
    const redKeys = new Set<string>()
    const all: ConflictInfo[] = []

    // Lấy khoảng giờ (phút) của 1 sự kiện để so xung đột
    const getRange = (ev: TimetableSchedule | Schedule): { start: number; end: number } | null => {
      // Ca làm: note đang chứa "scheduled_start-scheduled_end"
      if ('_isWork' in ev && ev._isWork && ev.note) {
        const [s, e] = ev.note.split('-')
        if (s && e) return { start: timeToMinutes(s), end: timeToMinutes(e) }
      }
      // Lịch theo giờ trực tiếp
      const startTime = 'start_time' in ev ? ev.start_time : undefined
      const endTime = 'end_time' in ev ? ev.end_time : undefined
      if (startTime && endTime) {
        return { start: timeToMinutes(startTime), end: timeToMinutes(endTime) }
      }
      // Lịch theo tiết
      const startPeriod = 'start_period' in ev ? ev.start_period : undefined
      const endPeriod = 'end_period' in ev ? ev.end_period : undefined
      const sp = startPeriod != null ? periodsByNumber.get(Number(startPeriod)) : undefined
      const ep = endPeriod != null ? periodsByNumber.get(Number(endPeriod)) : undefined
      if (sp && ep) return { start: sp.start, end: ep.end }
      return null
    }

    const pushEvent = (info: ConflictInfo) => all.push(info)

    weekDates.forEach((date, index) => {
      const iso = formatDateKey(date)
      const weekday = index + 2

      // Lịch cố định của ngày (theo weekday) — bỏ qua lịch đã nghỉ hôm đó
      fixedSchedules
        .filter((item) => item.weekday === weekday)
        .forEach((item) => {
          const isCancelled = scheduleOverrides.some(
            (o) =>
              o.type === 'cancel' &&
              Number(o.class_schedule_id) === Number(item.id) &&
              o.date === iso,
          )
          if (isCancelled) return
          const range = getRange(item)
          if (!range) return
          const subject = subjectsById.get(item.subject_id)
          pushEvent({
            key: `${iso}::${item.id}`,
            date: iso,
            ...range,
            label: subject?.name ?? 'Môn học',
            sub: subject?.code ?? '',
          })
        })

      // Học bù + ca làm (sự kiện 1 ngày)
      ;[...makeupSchedules, ...workEvents]
        .filter((ev) => ev.date === iso)
        .forEach((ev) => {
          const range = getRange(ev)
          if (!range) return
          const subject = ev.subject_id ? subjectsById.get(ev.subject_id) : undefined
          pushEvent({
            key: `${iso}::${ev.id}`,
            date: iso,
            ...range,
            label: ev._isWork
              ? `Ca làm ${ev.shift_type ?? ''}`
              : `${subject?.name ?? 'Môn học'} (học bù)`,
            sub: ev._isWork ? (ev._baseNote ?? '') : '',
          })
        })
    })

    // Tìm cặp trùng: startA < endB && startB < endA (có chồng lấn)
    const pairs: { a: ConflictInfo; b: ConflictInfo }[] = []
    all.forEach((a, i) => {
      for (let j = i + 1; j < all.length; j++) {
        const b = all[j]
        if (a.date !== b.date) continue
        if (a.start < b.end && b.start < a.end) {
          redKeys.add(a.key)
          redKeys.add(b.key)
          pairs.push({ a, b })
        }
      }
    })

    return { redKeys, pairs }
  }, [weekDates, fixedSchedules, makeupSchedules, workEvents, subjectsById, periodsByNumber, scheduleOverrides])

  const conflictPairs = conflicts.pairs
  const conflictRedKeys = conflicts.redKeys

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

      {conflictPairs.length > 0 && (
        <div className="timetable-conflict-panel">
          <div className="timetable-conflict-panel__header">
            <span className="timetable-conflict-panel__title">⚠️ Lịch bị trùng giờ ({conflictPairs.length})</span>
            <span className="timetable-conflict-panel__hint">Các ô đỏ trên lịch là những lịch đang đè lên nhau.</span>
          </div>
          <div className="timetable-conflict-panel__list">
            {conflictPairs.map(({ a, b }, i) => (
              <div key={i} className="timetable-conflict-panel__item">
                <span className="timetable-conflict-panel__day">
                  {formatDayLabel(a.date)}
                </span>
                <span className="timetable-conflict-panel__time">
                  {minutesToTime(a.start)} – {minutesToTime(Math.max(a.end, b.end))}
                </span>
                <span className="timetable-conflict-panel__names">
                  <span className="timetable-conflict-panel__name">{a.label}</span>
                  <span className="timetable-conflict-panel__sep">↔</span>
                  <span className="timetable-conflict-panel__name">{b.label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <TimeColumn timeSlots={timeSlots} />
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
                      timeSlots={timeSlots}
                      conflictKeys={conflictRedKeys}
                      scheduleOverrides={scheduleOverrides}
                      onScheduleClick={onScheduleClick}
                      onScheduleContextMenu={onScheduleContextMenu}
                      onAddWorkShiftFromCancel={onAddWorkShiftFromCancel}
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
