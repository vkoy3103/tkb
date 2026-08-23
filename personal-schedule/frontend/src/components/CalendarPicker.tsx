import React, { useMemo, useState } from 'react'
import '../styles/calendar-picker.css'

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTH_LABELS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
]

/** Format Date -> 'YYYY-MM-DD' theo giờ địa phương (tránh lệch múi giờ). */
function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'YYYY-MM-DD' -> Date (giờ địa phương, 00:00). */
function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface CalendarPickerProps {
  /** Ngày đang chọn, định dạng 'YYYY-MM-DD'. */
  value?: string | null
  onChange: (date: string) => void
  /** Không cho chọn ngày trước ngày này (định dạng 'YYYY-MM-DD'). */
  minDate?: string
  /** Không cho chọn ngày sau ngày này (định dạng 'YYYY-MM-DD'). */
  maxDate?: string
  disabled?: boolean
}

export function CalendarPicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
}: CalendarPickerProps): React.ReactElement {
  const todayKey = toDateKey(new Date())
  const [viewDate, setViewDate] = useState<Date>(() => (value ? fromDateKey(value) : new Date()))

  // Khi value đổi từ ngoài (vd mở modal sửa), đồng bộ tháng đang xem
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (value) setViewDate(fromDateKey(value))
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    // Monday-first: getDay() 0=CN ... 6=T7 => offset = (getDay()+6)%7
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ key: string; date: Date; inMonth: boolean }> = []

    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, i - startOffset + 1)
      cells.push({ key: toDateKey(d), date: d, inMonth: false })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      cells.push({ key: toDateKey(d), date: d, inMonth: true })
    }
    const remaining = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      cells.push({ key: toDateKey(d), date: d, inMonth: false })
    }
    return cells
  }, [year, month])

  const isDisabled = (key: string): boolean => {
    if (minDate && key < minDate) return true
    if (maxDate && key > maxDate) return true
    return false
  }

  const goPrev = () => setViewDate(new Date(year, month - 1, 1))
  const goNext = () => setViewDate(new Date(year, month + 1, 1))

  const selectedKey = value || ''

  return (
    <div className={`calendar-picker ${disabled ? 'calendar-picker--disabled' : ''}`}>
      <div className="calendar-picker__header">
        <button
          type="button"
          className="calendar-picker__nav"
          onClick={goPrev}
          disabled={disabled}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <div className="calendar-picker__title">
          {MONTH_LABELS[month]} {year}
        </div>
        <button
          type="button"
          className="calendar-picker__nav"
          onClick={goNext}
          disabled={disabled}
          aria-label="Tháng sau"
        >
          ›
        </button>
      </div>

      <div className="calendar-picker__weekdays">
        {DAY_LABELS.map((label) => (
          <div key={label} className="calendar-picker__weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-picker__grid">
        {days.map(({ key, date, inMonth }) => {
          const isSelected = key === selectedKey
          const isToday = key === todayKey
          const off = isDisabled(key)
          const disabledClass = off || disabled ? ' calendar-picker__day--disabled' : ''
          const outClass = inMonth ? '' : ' calendar-picker__day--outside'
          return (
            <button
              type="button"
              key={key}
              className={`calendar-picker__day${isSelected ? ' calendar-picker__day--selected' : ''}${
                isToday ? ' calendar-picker__day--today' : ''
              }${disabledClass}${outClass}`}
              onClick={() => !off && !disabled && onChange(key)}
              disabled={disabled}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="calendar-picker__footer">
        {selectedKey ? (
          <span className="calendar-picker__selected-label">
            📅 {fromDateKey(selectedKey).toLocaleDateString('vi-VN')}
          </span>
        ) : (
          <span className="calendar-picker__selected-label calendar-picker__selected-label--empty">
            Chưa chọn ngày
          </span>
        )}
        <button
          type="button"
          className="calendar-picker__today-btn"
          onClick={() => onChange(todayKey)}
          disabled={disabled || isDisabled(todayKey)}
        >
          Hôm nay
        </button>
      </div>
    </div>
  )
}
