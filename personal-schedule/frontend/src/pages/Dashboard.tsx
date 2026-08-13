import { useEffect, useState } from 'react'
import { fetchDayStatistics, fetchMonthStatistics, fetchWeekStatistics } from '../services/statisticsApi'
import type { Statistics } from '../types'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ'
}

export default function Dashboard() {
  const [today, setToday] = useState<Statistics | null>(null)
  const [week, setWeek] = useState<Statistics | null>(null)
  const [month, setMonth] = useState<Statistics | null>(null)

  useEffect(() => {
    const now = new Date()
    const dateString = now.toISOString().slice(0, 10)

    fetchDayStatistics(dateString).then(setToday).catch(() => null)
    fetchWeekStatistics(dateString).then(setWeek).catch(() => null)
    fetchMonthStatistics(dateString).then(setMonth).catch(() => null)
  }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">Tổng quan study, work và income.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Hôm nay</h3>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{today ? `${today.study_hours} giờ` : '—'}</p>
          <p className="mt-2 text-sm text-slate-600">Study</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{today ? `${today.work_hours} giờ` : '—'}</p>
          <p className="text-sm text-slate-600">Work</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{today ? formatCurrency(today.total_income) : '—'}</p>
          <p className="text-sm text-slate-600">Income</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Tuần này</h3>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{week ? `${week.study_hours} giờ` : '—'}</p>
          <p className="mt-2 text-sm text-slate-600">Study</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{week ? `${week.work_hours} giờ` : '—'}</p>
          <p className="text-sm text-slate-600">Work</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{week ? formatCurrency(week.total_income) : '—'}</p>
          <p className="text-sm text-slate-600">Income</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Tháng này</h3>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{month ? `${month.study_hours} giờ` : '—'}</p>
          <p className="mt-2 text-sm text-slate-600">Study</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{month ? `${month.work_hours} giờ` : '—'}</p>
          <p className="text-sm text-slate-600">Work</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{month ? formatCurrency(month.total_income) : '—'}</p>
          <p className="text-sm text-slate-600">Income</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {today && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Normal</h3>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(today.normal_income)}</p>
          </div>
        )}
        {today && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">NPC</h3>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(today.npc_income)}</p>
          </div>
        )}
        {today && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">OT</h3>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(today.ot_income)}</p>
          </div>
        )}
        {today && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">EXTEND</h3>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(today.extend_income)}</p>
          </div>
        )}
      </section>
    </div>
  )
}
