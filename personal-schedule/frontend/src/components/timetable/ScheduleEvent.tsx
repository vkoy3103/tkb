import type { ReactNode } from 'react'

type ScheduleEventProps = {
  title: string
  subtitle?: string
  meta?: string
  time: string
  color: string
  tone: 'subject' | 'work' | 'break' | 'cancelled' | 'makeup'
  children?: ReactNode
  onClick?: () => void
  gridRow?: string
}

export function ScheduleEvent({ title, subtitle, meta, time, color, tone, children, onClick, gridRow }: ScheduleEventProps) {
  const palette: Record<typeof tone, string> = {
    subject: 'border border-emerald-300 text-emerald-950',
    work: 'border border-violet-300 text-violet-950',
    break: 'border border-amber-300 text-amber-950',
    cancelled: 'border border-slate-300 bg-slate-100 text-slate-500 line-through',
    makeup: 'border border-sky-300 text-sky-950',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`timetable-event ${palette[tone]}`}
      style={{
        gridRow,
        gridColumn: '1',
        minHeight: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        borderColor: `${color}99`,
        boxShadow: `0 8px 18px ${color}33`,
      }}
    >
      <div className="timetable-event__body">
        <div className="timetable-event__content">
          <p className="timetable-event__title">{title}</p>
          {subtitle && <p className="timetable-event__text">{subtitle}</p>}
          {meta && <p className="timetable-event__text">{meta}</p>}
        </div>
        <div className="timetable-event__time">{time}</div>
        {children}
      </div>
    </button>
  )
}
