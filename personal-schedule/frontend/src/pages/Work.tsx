import { useCallback, useEffect, useMemo, useState } from 'react'
import { WorkShiftEditor } from './WorkShiftEditor'
import { WorkExtraEditor } from '../components/WorkExtraEditor'
import { WeekShiftScheduler } from '../components/WeekShiftScheduler'
import { ShiftMoneyEditor } from '../components/ShiftMoneyEditor'
import type { WeekShiftDraft } from '../components/WeekShiftScheduler'
import {
  createWorkShift,
  deleteWorkShift,
  fetchWorkShifts,
  syncWorkShiftExtras,
  updateWorkShift,
} from '../services/workShiftApi'
import {
  createWorkExtra,
  deleteWorkExtra,
  fetchWorkExtras,
  updateWorkExtra,
} from '../services/workExtraApi'
import { fetchWorkExtraTypes } from '../services/workExtraTypeApi'
import { fetchSettings } from '../services/settingsApi'
import type { SettingsEntry, WorkExtra, WorkExtraType, WorkShift } from '../types'

const fixedShifts = [
  { name: 'SHIFT 1', start: '09:00', end: '13:00' },
  { name: 'SHIFT 2', start: '13:00', end: '18:00' },
  { name: 'SHIFT 3', start: '18:00', end: '22:00' },
]

const statusStyle: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const statusLabel: Record<string, string> = {
  scheduled: 'Theo lịch',
  done: 'Đã làm',
  cancelled: 'Đã hủy',
}

function toMinutes(value?: string | null): number | null {
  if (!value) return null
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function calcNormalHours(shift: WorkShift): number {
  if (shift.status === 'cancelled') return 0
  const scheduledStart = toMinutes(shift.scheduled_start)
  const scheduledEnd = toMinutes(shift.scheduled_end)
  if (scheduledStart == null || scheduledEnd == null) return 0
  const start = toMinutes(shift.actual_start) ?? scheduledStart
  const actualEnd = toMinutes(shift.actual_end) ?? scheduledEnd
  const normalEnd = Math.min(actualEnd, scheduledEnd)
  return Math.max(0, (normalEnd - start) / 60)
}

function calcOtHours(shift: WorkShift, otStartMinutes: number): number {
  if (shift.status === 'cancelled') return 0
  const scheduledEnd = toMinutes(shift.scheduled_end)
  if (scheduledEnd == null) return 0
  const actualEnd = toMinutes(shift.actual_end) ?? scheduledEnd
  const start = Math.max(scheduledEnd, otStartMinutes)
  if (actualEnd <= start) return 0
  return Math.max(0, (actualEnd - start) / 60)
}

const formatVND = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} VNĐ`
const formatHours = (value: number) => `${(Number(value) || 0).toFixed(1)}h`

export default function WorkPage() {
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [extras, setExtras] = useState<WorkExtra[]>([])
  const [extraTypes, setExtraTypes] = useState<WorkExtraType[]>([])
  const [settings, setSettings] = useState<SettingsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Shift editor state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [shiftToEdit, setShiftToEdit] = useState<WorkShift | null>(null)
  const [shiftPreset, setShiftPreset] = useState<Partial<WorkShift> | undefined>(undefined)

  // Extra editor state
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false)
  const [extraTargetShift, setExtraTargetShift] = useState<WorkShift | null>(null)
  const [extraToEdit, setExtraToEdit] = useState<WorkExtra | null>(null)

  // Tiền ca (bấm vào ca) state
  const [moneyShift, setMoneyShift] = useState<WorkShift | null>(null)

  // Week scheduler state
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false)

  const load = async () => {
    const [shiftData, extraData, typeData, settingData] = await Promise.all([
      fetchWorkShifts(),
      fetchWorkExtras(),
      fetchWorkExtraTypes(),
      fetchSettings(),
    ])
    setShifts(shiftData)
    setExtras(extraData)
    setExtraTypes(typeData)
    setSettings(settingData)
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        await load()
      } catch {
        setError('Không thể tải dữ liệu làm việc.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const rates = useMemo(() => {
    const map: Record<string, number> = {}
    settings.forEach((s) => {
      if (s.key) {
        const value = Number(s.value)
        if (!Number.isNaN(value)) map[s.key] = value
      }
    })
    return map
  }, [settings])

  // Giờ bắt đầu tính OT (mặc định 22:00) từ settings
  const otStartMinutes = useMemo(() => {
    const raw = settings.find((s) => s.key === 'OT_START_TIME')?.value
    if (raw) {
      const [h, m] = raw.split(':').map(Number)
      if (!Number.isNaN(h)) return h * 60 + (m || 0)
    }
    return 22 * 60
  }, [settings])

  const extraMap = useMemo(() => {
    const map = new Map<number, WorkExtra[]>()
    extras.forEach((extra) => {
      const list = map.get(extra.work_shift_id) ?? []
      list.push(extra)
      map.set(extra.work_shift_id, list)
    })
    return map
  }, [extras])

  // ----- Tính tiền cho từng ca -----
  const shiftMoney = useCallback(
    (shift: WorkShift) => {
      const normalHours = calcNormalHours(shift)
      let otHours = calcOtHours(shift, otStartMinutes)
      let normalIncome = normalHours * (rates.NORMAL_RATE ?? 0)
      // OT = x2 lương ca thường (2 x NORMAL_RATE)
      const otRate = 2 * (rates.NORMAL_RATE ?? 0)
      let otIncome = otHours * otRate
      let npcIncome = 0
      let extendIncome = 0
      for (const extra of extraMap.get(shift.id) ?? []) {
        const amount = extra.amount ?? 0
        if (extra.type === 'NPC') npcIncome += amount
        else if (extra.type === 'EXTEND') extendIncome += amount
        else {
          otHours += extra.quantity ?? 0
          otIncome += amount
        }
      }
      return {
        normalHours,
        otHours,
        normalIncome,
        otIncome,
        npcIncome,
        extendIncome,
        total: normalIncome + otIncome + npcIncome + extendIncome,
      }
    },
    [extraMap, rates, otStartMinutes],
  )

  const monthKey = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  // ----- Tổng thu nhập tháng này -----
  const monthlySummary = useMemo(() => {
    let totalHours = 0
    let otHours = 0
    let otIncome = 0
    let totalIncome = 0
    let shiftCount = 0
    for (const shift of shifts) {
      if (!shift.date.startsWith(monthKey)) continue
      const money = shiftMoney(shift)
      totalHours += money.normalHours + money.otHours
      otHours += money.otHours
      otIncome += money.otIncome
      totalIncome += money.total
      shiftCount += 1
    }
    return { totalHours, otHours, otIncome, totalIncome, shiftCount }
  }, [shifts, monthKey, shiftMoney])

  // ----- Handlers: ca làm -----
  const openAddShift = (preset?: Partial<WorkShift>) => {
    setShiftToEdit(null)
    setShiftPreset(preset)
    setIsShiftModalOpen(true)
  }

  const openEditShift = (shift: WorkShift) => {
    setShiftToEdit(shift)
    setShiftPreset(undefined)
    setIsShiftModalOpen(true)
  }

  const handleSaveShift = async (data: Partial<WorkShift>) => {
    setSaving(true)
    try {
      if (shiftToEdit) {
        await updateWorkShift(shiftToEdit.id, data)
      } else {
        await createWorkShift(data)
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteShift = async () => {
    if (!shiftToEdit) return
    if (!window.confirm('Xóa ca làm này và toàn bộ phụ thu liên quan?')) return
    setSaving(true)
    try {
      await deleteWorkShift(shiftToEdit.id)
      await load()
    } finally {
      setSaving(false)
    }
  }

  // ----- Handlers: phụ thu -----
  const openAddExtra = (shift: WorkShift) => {
    setExtraTargetShift(shift)
    setExtraToEdit(null)
    setIsExtraModalOpen(true)
  }

  const openEditExtra = (extra: WorkExtra) => {
    setExtraToEdit(extra)
    setIsExtraModalOpen(true)
  }

  const handleSaveExtra = async (data: Partial<WorkExtra>) => {
    setSaving(true)
    try {
      if (extraToEdit) {
        await updateWorkExtra(extraToEdit.id, data)
      } else if (extraTargetShift) {
        await createWorkExtra({ ...data, work_shift_id: extraTargetShift.id })
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExtra = async () => {
    if (!extraToEdit) return
    if (!window.confirm('Xóa khoản phụ thu này?')) return
    setSaving(true)
    try {
      await deleteWorkExtra(extraToEdit.id)
      await load()
    } finally {
      setSaving(false)
    }
  }

  // ----- Handlers: tiền ca (bấm vào ca) -----
  const openShiftMoney = (shift: WorkShift) => {
    setMoneyShift(shift)
  }

  const handleSaveShiftMoney = async (
    shift: WorkShift,
    values: { npcHours: number; otHours: number; extendCount: number },
    status: string,
  ) => {
    setSaving(true)
    try {
      await syncWorkShiftExtras(shift.id, {
        status,
        npc_hours: values.npcHours,
        ot_hours: values.otHours,
        extend_count: values.extendCount,
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteShiftMoney = async (shift: WorkShift) => {
    if (!window.confirm(`Xóa ca ${shift.shift_type} ngày ${shift.date}?`)) return
    setSaving(true)
    try {
      await deleteWorkShift(shift.id)
      await load()
    } finally {
      setSaving(false)
    }
  }

  // ----- Handlers: thêm ca theo tuần -----
  const handleSaveWeekShifts = async (drafts: WeekShiftDraft[]) => {
    setSaving(true)
    try {
      await Promise.all(drafts.map((d) => createWorkShift(d)))
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleQuickDeleteShift = async (shift: WorkShift) => {
    if (!window.confirm(`Xóa ca ${shift.shift_type} ngày ${shift.date}?`)) return
    setSaving(true)
    try {
      await deleteWorkShift(shift.id)
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải ca làm...</div>
  }

  if (error) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Work</h2>
            <p className="mt-2 text-sm text-slate-600">Quản lý ca làm, phụ thu và tính tiền</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsWeekModalOpen(true)}
              className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              🗓️ Thêm ca theo tuần
            </button>
          </div>
        </div>
      </header>

      {/* Tổng kết tháng này */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Giờ làm tháng này</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatHours(monthlySummary.totalHours)}</p>
          <p className="mt-1 text-sm text-slate-500">{monthlySummary.shiftCount} ca</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Giờ OT</p>
          <p className="mt-3 text-3xl font-semibold text-amber-600">{formatHours(monthlySummary.otHours)}</p>
          <p className="mt-1 text-sm text-slate-500">{formatVND(monthlySummary.otIncome)}</p>
        </article>
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Thu nhập tháng này</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-800">{formatVND(monthlySummary.totalIncome)}</p>
          <p className="mt-1 text-sm text-emerald-600">Chưa trừ phí</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Đơn giá</p>
          <p className="mt-3 text-sm font-medium text-slate-700">Normal {formatVND(rates.NORMAL_RATE ?? 0)}/h</p>
          <p className="mt-1 text-sm font-medium text-slate-700">OT {formatVND(2 * (rates.NORMAL_RATE ?? 0))}/h (x2)</p>
        </article>
      </section>

      {/* Thêm ca nhanh theo khung giờ */}
      <section>
        <h3 className="mb-3 text-lg font-semibold">Thêm ca nhanh theo khung giờ</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {fixedShifts.map((slot) => (
            <button
              key={slot.name}
              type="button"
              onClick={() =>
                openAddShift({
                  shift_type: slot.name,
                  scheduled_start: slot.start,
                  scheduled_end: slot.end,
                  status: 'scheduled',
                })
              }
              className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{slot.name}</p>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {slot.start} - {slot.end}
              </p>
              <p className="mt-2 text-sm text-emerald-600">Bấm để thêm ca ➜</p>
            </button>
          ))}
        </div>
      </section>

      {/* Danh sách ca làm */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Ca làm</h3>
        <div className="mt-4 space-y-3">
          {shifts.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có lịch làm. Bấm "＋ Thêm ca làm" để bắt đầu.</p>
          ) : (
            shifts.map((shift) => {
              const money = shiftMoney(shift)
              const shiftExtras = extraMap.get(shift.id) ?? []
              return (
                <div
                  key={shift.id}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:shadow-md"
                  onClick={() => openShiftMoney(shift)}
                  title="Bấm để nhập NPC/OT/EXTEND và xem tiền ca"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{shift.shift_type}</p>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyle[shift.status] ?? statusStyle.scheduled}`}>
                          {statusLabel[shift.status] ?? shift.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {shift.date} · Dự kiến {shift.scheduled_start} - {shift.scheduled_end}
                        {shift.actual_start && shift.actual_end
                          ? ` · Thực tế ${shift.actual_start} - ${shift.actual_end}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openAddExtra(shift)
                        }}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        ＋ Phụ thu
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditShift(shift)
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleQuickDeleteShift(shift)
                        }}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {shift.note && <p className="mt-2 text-xs italic text-slate-500">📝 {shift.note}</p>}

                  {/* Phụ thu */}
                  {shiftExtras.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {shiftExtras.map((extra) => (
                        <div
                          key={extra.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                              {extra.type_name ?? extra.type ?? 'EXTRA'}
                            </span>
                            <span className="text-sm text-slate-600">
                              {extra.quantity != null ? `${extra.quantity} × ` : ''}
                              {extra.unit_price != null ? `${Number(extra.unit_price).toLocaleString('vi-VN')}đ` : ''}
                              {extra.note ? ` · ${extra.note}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{formatVND(extra.amount ?? 0)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditExtra(extra)
                              }}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
                            >
                              Sửa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tiền ca này */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">
                      NORMAL {formatHours(money.normalHours)} · {formatVND(money.normalIncome)}
                    </span>
                    {money.otHours > 0 || money.otIncome > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        OT {formatHours(money.otHours)} · {formatVND(money.otIncome)}
                      </span>
                    ) : null}
                    {money.npcIncome > 0 ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">
                        NPC · {formatVND(money.npcIncome)}
                      </span>
                    ) : null}
                    {money.extendIncome > 0 ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">
                        EXTEND · {formatVND(money.extendIncome)}
                      </span>
                    ) : null}
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                      Tổng {formatVND(money.total)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <WorkShiftEditor
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        shiftToEdit={shiftToEdit}
        preset={shiftPreset}
        isLoading={saving}
      />

      <WorkExtraEditor
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        onSave={handleSaveExtra}
        onDelete={handleDeleteExtra}
        extraToEdit={extraToEdit}
        extraTypes={extraTypes}
        settings={settings}
        isLoading={saving}
      />

      <WeekShiftScheduler
        isOpen={isWeekModalOpen}
        onClose={() => setIsWeekModalOpen(false)}
        onSave={handleSaveWeekShifts}
        isLoading={saving}
      />

      <ShiftMoneyEditor
        isOpen={!!moneyShift}
        shift={moneyShift}
        extras={moneyShift ? (extraMap.get(moneyShift.id) ?? []) : []}
        settings={settings}
        onClose={() => setMoneyShift(null)}
        onSave={handleSaveShiftMoney}
        onDelete={handleDeleteShiftMoney}
        isLoading={saving}
      />
    </div>
  )
}
