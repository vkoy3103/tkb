import { useEffect, useMemo, useState } from 'react'
import { fetchSchedules } from '../services/scheduleApi'
import { fetchSubjects } from '../services/subjectApi'
import { fetchPeriods } from '../services/periodApi'
import { fetchWorkShifts } from '../services/workShiftApi'
import { fetchDayStatistics, fetchMonthStatistics, fetchWeekStatistics } from '../services/statisticsApi'
import type { Period, Schedule, Statistics, Subject, WorkShift } from '../types'
import '../styles/dashboard.css'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ'
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toHours(value: number) {
  return `${Number(value || 0).toFixed(1)} giờ`
}

function getDayOffsetForSchedule(scheduleWeekday: number, today: Date) {
  const jsDay = scheduleWeekday === 8 ? 0 : scheduleWeekday - 1
  const todayDay = today.getDay()
  let diff = jsDay - todayDay
  if (diff < 0) {
    diff += 7
  }
  return diff
}

export default function Dashboard() {
  const [todayStats, setTodayStats] = useState<Statistics | null>(null)
  const [weekStats, setWeekStats] = useState<Statistics | null>(null)
  const [monthStats, setMonthStats] = useState<Statistics | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [loadingDate, setLoadingDate] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadDashboardForDate = (date: Date) => {
    const dateString = toInputDate(date)
    setLoadingDate(dateString)

    return Promise.all([
      fetchDayStatistics(dateString),
      fetchWeekStatistics(dateString),
      fetchMonthStatistics(dateString),
      fetchSchedules(),
      fetchSubjects(),
      fetchPeriods(),
      fetchWorkShifts(),
    ])
      .then(([day, week, month, scheduleData, subjectData, periodData, shiftData]) => {
        setTodayStats(day)
        setWeekStats(week)
        setMonthStats(month)
        setSchedules(scheduleData)
        setSubjects(subjectData)
        setPeriods(periodData)
        setWorkShifts(shiftData)
      })
  }

  useEffect(() => {
    setLoading(true)
    loadDashboardForDate(selectedDate)
      .catch(() => setError('Không thể tải dữ liệu dashboard.'))
      .finally(() => setLoading(false))
  }, [selectedDate])

  const getPeriodByNumber = (periodNumber: number) =>
    periods.find((period) => period.period_number === periodNumber)

  const formatClock = (value?: string | null) => {
    if (!value) return '??:??'
    return value.slice(0, 5)
  }

  const changeSelectedDate = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    setSelectedDate(next)
  }

  const getDayLabel = (date: Date) => {
    const today = new Date()
    const diff = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000)

    if (diff === 0) return 'Hôm nay'
    if (diff === -1) return 'Hôm qua'
    if (diff === 1) return 'Ngày mai'
    if (diff === 2) return 'Ngày kia'
    return formatDay(date)
  }

  const upcomingSchedules = useMemo(() => {
    const selected = new Date(selectedDate)

    return [...schedules]
      .map((schedule) => {
        const startPeriod = getPeriodByNumber(schedule.start_period)
        const target = new Date(selected)
        const daysAhead = getDayOffsetForSchedule(schedule.weekday, selected)
        target.setDate(selected.getDate() + daysAhead)

        if (startPeriod?.start_time) {
          const [hours, minutes] = startPeriod.start_time.split(':').map(Number)
          target.setHours(hours, minutes, 0, 0)
        } else {
          target.setHours(7 + (schedule.start_period - 1), 0, 0, 0)
        }

        return { schedule, target }
      })
      .filter((entry) => entry.target.toDateString() === selected.toDateString())
      .sort((a, b) => a.target.getTime() - b.target.getTime())
  }, [schedules, periods, selectedDate])

  const upcomingShifts = useMemo(() => {
    const selected = new Date(selectedDate)
    const selectedDateString = toInputDate(selected)

    return [...workShifts]
      .filter((shift) => shift.date === selectedDateString)
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
      .slice(0, 3)
  }, [workShifts, selectedDate])

  if (loading && !todayStats && !weekStats && !monthStats) {
    return (
      <div className="dashboard-card dashboard-empty">
        Đang tải dashboard...
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h2 className="dashboard-header__title">Dashboard</h2>
          <p className="dashboard-header__subtitle">{formatDay(selectedDate)}</p>
        </div>

        <div className="dashboard-header__controls">
          <button type="button" className="dashboard-date-button" onClick={() => changeSelectedDate(-1)}>
            Hôm qua
          </button>
          <button type="button" className="dashboard-date-button" onClick={() => setSelectedDate(new Date())}>
            Hôm nay
          </button>
          <button type="button" className="dashboard-date-button" onClick={() => changeSelectedDate(1)}>
            Ngày mai
          </button>
          <input
            type="date"
            className="dashboard-date-input"
            value={toInputDate(selectedDate)}
            onChange={(event) => {
              const value = event.target.value
              if (!value) return
              const nextDate = new Date(`${value}T00:00:00`)
              setSelectedDate(nextDate)
            }}
          />
        </div>
      </header>

      {error && <div className="dashboard-alert">{error}</div>}
      {loadingDate && loadingDate !== toInputDate(selectedDate) && (
        <div className="dashboard-loading-inline">Đang cập nhật dữ liệu...</div>
      )}

      <section className="dashboard-grid">
        <div className="dashboard-card">
          <h3 className="dashboard-card__label">{getDayLabel(selectedDate)}</h3>
          <p className="dashboard-card__value">{todayStats ? toHours(todayStats.study_hours) : '0.0 giờ'}</p>
          <p className="dashboard-card__caption">Học</p>
          <p className="dashboard-card__subvalue">{todayStats ? toHours(todayStats.work_hours) : '0.0 giờ'}</p>
          <p className="dashboard-card__subcaption">Làm</p>
          <p className="dashboard-card__subvalue">{todayStats ? formatCurrency(todayStats.total_income) : '0 VNĐ'}</p>
          <p className="dashboard-card__subcaption">Lương</p>
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card__label">Tuần này</h3>
          <p className="dashboard-card__value">{weekStats ? toHours(weekStats.study_hours) : '0.0 giờ'}</p>
          <p className="dashboard-card__caption">Học</p>
          <p className="dashboard-card__subvalue">{weekStats ? toHours(weekStats.work_hours) : '0.0 giờ'}</p>
          <p className="dashboard-card__subcaption">Làm</p>
          <p className="dashboard-card__subvalue">{weekStats ? formatCurrency(weekStats.total_income) : '0 VNĐ'}</p>
          <p className="dashboard-card__subcaption">Lương</p>
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card__label">Tháng này</h3>
          <p className="dashboard-card__value">{monthStats ? toHours(monthStats.study_hours) : '0.0 giờ'}</p>
          <p className="dashboard-card__caption">Học</p>
          <p className="dashboard-card__subvalue">{monthStats ? toHours(monthStats.work_hours) : '0.0 giờ'}</p>
          <p className="dashboard-card__subcaption">Làm</p>
          <p className="dashboard-card__subvalue">{monthStats ? formatCurrency(monthStats.total_income) : '0 VNĐ'}</p>
          <p className="dashboard-card__subcaption">Lương</p>
        </div>
      </section>

      <section className="dashboard-two-col">
        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Lịch học {getDayLabel(selectedDate)}</h3>
          <div className="dashboard-list">
            {upcomingSchedules.length === 0 ? (
              <p className="dashboard-empty">Chưa có lịch học.</p>
            ) : (
              upcomingSchedules.map(({ schedule, target }) => {
                const subject = subjects.find((item) => item.id === schedule.subject_id)
                const label = subject?.name ?? schedule.note ?? 'Lịch học'
                const periodStart = getPeriodByNumber(schedule.start_period)
                const periodEnd = getPeriodByNumber(schedule.end_period)
                const timeRange = periodStart && periodEnd
                  ? `${formatClock(periodStart.start_time)} - ${formatClock(periodEnd.end_time)}`
                  : `${schedule.start_period} - ${schedule.end_period}`

                return (
                  <div key={schedule.id} className="dashboard-item">
                    <p className="dashboard-item__title">{label}</p>
                    <p className="dashboard-item__meta">
                      {target.toLocaleDateString('vi-VN')} · {timeRange} · {schedule.room || 'Không có phòng'}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Ca làm {getDayLabel(selectedDate)}</h3>
          <div className="dashboard-list">
            {upcomingShifts.length === 0 ? (
              <p className="dashboard-empty">Chưa có ca làm.</p>
            ) : (
              upcomingShifts.map((shift) => (
                <div key={shift.id} className="dashboard-item">
                  <p className="dashboard-item__title">{shift.shift_type}</p>
                  <p className="dashboard-item__meta">{shift.date} · {shift.scheduled_start} - {shift.scheduled_end}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
