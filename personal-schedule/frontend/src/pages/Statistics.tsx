import { useEffect, useState } from 'react'
import { fetchDayStatistics, fetchMonthStatistics, fetchWeekStatistics } from '../services/statisticsApi'
import type { Statistics } from '../types'

const filters = ['Today', 'This Week', 'This Month'] as const

type Filter = (typeof filters)[number]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ'
}

export default function StatisticsPage() {
  const [filter, setFilter] = useState<Filter>('Today')
  const [data, setData] = useState<Statistics | null>(null)

  useEffect(() => {
    const now = new Date()
    const dateString = now.toISOString().slice(0, 10)
    const loader = filter === 'Today' ? fetchDayStatistics : filter === 'This Week' ? fetchWeekStatistics : fetchMonthStatistics
    loader(dateString).then(setData).catch(() => null)
  }, [filter])

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Statistics</h2>
        <p className="mt-2 text-sm text-slate-600">Thống kê chi tiết theo study, work và salary.</p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Filter</h3>
            <p className="mt-1 text-sm text-slate-500">Chọn phạm vi thống kê.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  filter === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Study hours</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{data ? `${data.study_hours}h` : '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Work hours</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{data ? `${data.work_hours}h` : '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Normal</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{data ? `${data.normal_hours}h` : '—'}</p>
            <p className="mt-2 text-sm text-slate-600">{data ? formatCurrency(data.normal_income) : '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">NPC</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{data ? `${data.npc_hours}h` : '—'}</p>
            <p className="mt-2 text-sm text-slate-600">{data ? formatCurrency(data.npc_income) : '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">OT</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{data ? `${data.ot_hours}h` : '—'}</p>
            <p className="mt-2 text-sm text-slate-600">{data ? formatCurrency(data.ot_income) : '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">EXTEND</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{data ? `${data.extend_count} lần` : '—'}</p>
            <p className="mt-2 text-sm text-slate-600">{data ? formatCurrency(data.extend_income) : '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:col-span-2">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{data ? formatCurrency(data.total_income) : '—'}</p>
          </article>
        </div>
      </div>
    </div>
  )
}
