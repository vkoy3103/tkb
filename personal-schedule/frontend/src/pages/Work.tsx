import { useEffect, useMemo, useState } from 'react'
import { fetchWorkShifts } from '../services/workShiftApi'
import { fetchWorkExtras } from '../services/workExtraApi'
import type { WorkExtra, WorkShift } from '../types'

const fixedShifts = [
  { name: 'SHIFT 1', start: '09:00', end: '13:00' },
  { name: 'SHIFT 2', start: '13:00', end: '18:00' },
  { name: 'SHIFT 3', start: '18:00', end: '22:00' },
]

export default function WorkPage() {
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [extras, setExtras] = useState<WorkExtra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [shiftData, extraData] = await Promise.all([fetchWorkShifts(), fetchWorkExtras()])
        setShifts(shiftData)
        setExtras(extraData)
      } catch {
        setError('Không thể tải dữ liệu làm việc.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const extraMap = useMemo(() => {
    const map = new Map<number, WorkExtra[]>()
    extras.forEach((extra) => {
      const list = map.get(extra.work_shift_id) ?? []
      list.push(extra)
      map.set(extra.work_shift_id, list)
    })
    return map
  }, [extras])

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải ca làm...</div>
  }

  if (error) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Work</h2>
        <p className="mt-2 text-sm text-slate-600">Quản lý ca làm và phụ thu</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {fixedShifts.map((slot) => (
          <button key={slot.name} type="button" className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{slot.name}</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{slot.start} - {slot.end}</p>
          </button>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Ca làm hiện có</h3>
        <div className="mt-4 space-y-3">
          {shifts.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có lịch làm.</p>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{shift.shift_type}</p>
                    <p className="text-sm text-slate-600">{shift.date} · {shift.scheduled_start} - {shift.scheduled_end}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{shift.status}</span>
                </div>
                {(extraMap.get(shift.id) ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(extraMap.get(shift.id) ?? []).map((extra) => (
                      <span key={extra.id} className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">
                        {extra.type ?? 'EXTRA'} · {extra.quantity ?? extra.amount}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
