import { useCallback, useEffect, useMemo, useState } from 'react'
import { WorkShiftEditor } from './WorkShiftEditor'
import { WorkExtraEditor } from '../components/WorkExtraEditor'
import { WeekShiftScheduler } from '../components/WeekShiftScheduler'
import { ShiftMoneyEditor } from '../components/ShiftMoneyEditor'
import { WorkQuickImportScheduler } from '../components/WorkQuickImportScheduler'
import { OtherIncomeCard } from '../components/OtherIncomeCard'
import type { WeekShiftDraft } from '../components/WeekShiftScheduler'
import {
  createWorkShift,
  createWorkShiftsBulk,
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
import { fetchSettings, updateSetting } from '../services/settingsApi'
import {
  createOtherIncome,
  deleteOtherIncome,
  fetchOtherIncomes,
  updateOtherIncome,
} from '../services/otherIncomeApi'
import type { SettingsEntry, WorkExtra, WorkExtraType, WorkShift, OtherIncome } from '../types'
import { getOtRate, settingsToRates } from '../utils/salary'
import { calcShiftMoney, getOtStartMinutes } from '../utils/workMoney'
import '../styles/pages.css'

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

const formatVND = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} VNĐ`
const formatHours = (value: number) => `${(Number(value) || 0).toFixed(1)}h`

// Hiển thị đơn giá gọn: 20000 -> 20k, 40000 -> 40k
function formatK(value: number): string {
  if (!value) return '0'
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000}k`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
function getWeekdayShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return WEEKDAY_SHORT[d.getDay()] ?? ''
}
function formatDay(dateStr: string): string {
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`
}

export default function WorkPage() {
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [extras, setExtras] = useState<WorkExtra[]>([])
  const [extraTypes, setExtraTypes] = useState<WorkExtraType[]>([])
  const [settings, setSettings] = useState<SettingsEntry[]>([])
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([])
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

  // Quick import state
  const [isQuickImportOpen, setIsQuickImportOpen] = useState(false)

  const load = async () => {
    const [shiftData, extraData, typeData, settingData, otherIncomeData] = await Promise.all([
      fetchWorkShifts(),
      fetchWorkExtras(),
      fetchWorkExtraTypes(),
      fetchSettings(),
      fetchOtherIncomes(),
    ])
    setShifts(shiftData)
    setExtras(extraData)
    setExtraTypes(typeData)
    setSettings(settingData)
    setOtherIncomes(otherIncomeData)
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

  const rates = useMemo(() => settingsToRates(settings), [settings])

  // Giờ bắt đầu tính OT (mặc định 22:00) từ settings
  const otStartMinutes = useMemo(() => getOtStartMinutes(settings), [settings])

  // ----- Chỉnh đơn giá ngay trên card (lưu vào settings) -----
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({})
  useEffect(() => {
    setRateDraft((prev) => {
      const merged = { ...prev }
      let changed = false
      ;['NORMAL_RATE', 'NPC_RATE', 'EXTEND_RATE'].forEach((key) => {
        const setting = settings.find((s) => s.key === key)
        if (setting?.value != null && merged[key] === undefined) {
          merged[key] = setting.value
          changed = true
        }
      })
      return changed ? merged : prev
    })
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
    (shift: WorkShift) => calcShiftMoney(shift, extraMap.get(shift.id) ?? [], rates, otStartMinutes),
    [extraMap, rates, otStartMinutes],
  )

  // ----- Chọn tháng để xem (lịch làm + thu nhập theo tháng) -----
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const nowDate = new Date()
  const isCurrentMonth =
    viewMonth.getFullYear() === nowDate.getFullYear() && viewMonth.getMonth() === nowDate.getMonth()
  const monthKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(viewMonth)
  const monthShort = `${viewMonth.getMonth() + 1}/${viewMonth.getFullYear()}`
  const goPrevMonth = () => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goNextMonth = () => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goCurrentMonth = () => {
    const n = new Date()
    setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1))
  }

  // ----- Tổng thu nhập tháng này -----
  const monthlySummary = useMemo(() => {
    let totalHours = 0
    let otHours = 0
    let otIncome = 0
    let npcHours = 0
    let npcIncome = 0
    let extendCount = 0
    let extendIncome = 0
    let totalIncome = 0
    let normalIncome = 0
    let shiftCount = 0
    for (const shift of shifts) {
      if (!shift.date.startsWith(monthKey)) continue
      const money = shiftMoney(shift)
      // Giờ làm chỉ tính ca thường; OT/NPC/EXTEND là làm thêm trong ca, không cộng vào giờ làm
      totalHours += money.normalHours
      normalIncome += money.normalIncome
      otHours += money.otHours
      otIncome += money.otIncome
      npcHours += money.npcHours
      npcIncome += money.npcIncome
      extendCount += money.extendCount
      extendIncome += money.extendIncome
      totalIncome += money.total
      shiftCount += 1
    }
    return { totalHours, normalIncome, otHours, otIncome, npcHours, npcIncome, extendCount, extendIncome, totalIncome, shiftCount }
  }, [shifts, monthKey, shiftMoney])

  // ----- Thu nhập khác (thưởng/phụ cấp nhập tay) trong tháng đang xem -----
  const monthOtherIncomes = useMemo(() => {
    return otherIncomes
      .filter((o) => o.date.startsWith(monthKey))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  }, [otherIncomes, monthKey])

  const otherIncomeTotal = useMemo(
    () => monthOtherIncomes.reduce((sum, o) => sum + (o.amount || 0), 0),
    [monthOtherIncomes],
  )

  // Tổng thu nhập tháng = tiền ca + thu nhập khác
  const monthIncomeTotal = monthlySummary.totalIncome + otherIncomeTotal

  // Các ngày trong tháng đang xem
  const monthDays = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    })
  }, [viewMonth])

  const todayKey = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [])

  // Ca làm theo từng ngày (chỉ trong tháng này)
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, WorkShift[]>()
    for (const shift of shifts) {
      if (!shift.date.startsWith(monthKey)) continue
      const list = map.get(shift.date) ?? []
      list.push(shift)
      map.set(shift.date, list)
    }
    return map
  }, [shifts, monthKey])

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
        const updated = await updateWorkShift(shiftToEdit.id, data)
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      } else {
        const created = await createWorkShift(data)
        setShifts((prev) => [...prev, created])
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteShift = async () => {
    if (!shiftToEdit) return
    const id = shiftToEdit.id
    setSaving(true)
    try {
      await deleteWorkShift(id)
      setShifts((prev) => prev.filter((s) => s.id !== id))
      setExtras((prev) => prev.filter((e) => e.work_shift_id !== id))
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

  const handleSaveExtra = async (data: Partial<WorkExtra>) => {
    setSaving(true)
    try {
      if (extraToEdit) {
        const updated = await updateWorkExtra(extraToEdit.id, data)
        // Cập nhật state cục bộ — không tải lại toàn bộ trang
        setExtras((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      } else if (extraTargetShift) {
        const created = await createWorkExtra({ ...data, work_shift_id: extraTargetShift.id })
        setExtras((prev) => [...prev, created])
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExtra = async () => {
    if (!extraToEdit) return
    const id = extraToEdit.id
    setSaving(true)
    try {
      await deleteWorkExtra(id)
      // Xóa khỏi state cục bộ — không tải lại toàn bộ trang
      setExtras((prev) => prev.filter((e) => e.id !== id))
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
    values: { npcHours: number; otHours: number; extendCount: number; coefficient: number },
  ) => {
    setSaving(true)
    try {
      const updated = await syncWorkShiftExtras(shift.id, {
        npc_hours: values.npcHours,
        ot_hours: values.otHours,
        extend_count: values.extendCount,
        coefficient: values.coefficient,
      })
      // Cập nhật cục bộ — không tải lại toàn bộ trang
      setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      const extras = await fetchWorkExtras()
      setExtras(extras)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteShiftMoney = async (shift: WorkShift) => {
    setSaving(true)
    try {
      await deleteWorkShift(shift.id)
      setShifts((prev) => prev.filter((s) => s.id !== shift.id))
      setExtras((prev) => prev.filter((e) => e.work_shift_id !== shift.id))
    } finally {
      setSaving(false)
    }
  }

  // ----- Handlers: thêm ca theo tuần -----
  const handleSaveWeekShifts = async (toCreate: WeekShiftDraft[], toDeleteIds: number[]) => {
    setSaving(true)
    try {
      // Tạo toàn bộ ca trong 1 request (nhanh hơn nhiều)
      const created = await createWorkShiftsBulk(toCreate)
      setShifts((prev) => [...prev, ...created])
      // Bỏ tick ca đã có → xoá ca tương ứng (đồng bộ như trang Schedule)
      if (toDeleteIds.length > 0) {
        await Promise.all(toDeleteIds.map((id) => deleteWorkShift(id)))
        setShifts((prev) => prev.filter((s) => !toDeleteIds.includes(s.id)))
        setExtras((prev) => prev.filter((e) => !toDeleteIds.includes(e.work_shift_id)))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleQuickDeleteShift = async (shift: WorkShift) => {
    setSaving(true)
    try {
      await deleteWorkShift(shift.id)
      setShifts((prev) => prev.filter((s) => s.id !== shift.id))
      setExtras((prev) => prev.filter((e) => e.work_shift_id !== shift.id))
    } finally {
      setSaving(false)
    }
  }

  // ----- Handlers: thu nhập khác (thưởng/phụ cấp nhập tay) -----
  const handleAddOtherIncome = async (payload: { date: string; note?: string | null; amount: number }) => {
    setSaving(true)
    try {
      const created = await createOtherIncome(payload)
      setOtherIncomes((prev) => [...prev, created])
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateOtherIncome = async (
    id: number,
    payload: Partial<{ date: string; note?: string | null; amount: number }>,
  ) => {
    setSaving(true)
    try {
      const updated = await updateOtherIncome(id, payload)
      setOtherIncomes((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOtherIncome = async (id: number) => {
    setSaving(true)
    try {
      await deleteOtherIncome(id)
      setOtherIncomes((prev) => prev.filter((o) => o.id !== id))
    } finally {
      setSaving(false)
    }
  }

  // ----- Lưu đơn giá từng ô (lưu khi rời ô hoặc bấm Enter) -----
  const saveRate = async (key: string) => {
    setSaving(true)
    try {
      await updateSetting(key, { value: rateDraft[key] ?? '' })
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
    <div className="pg-page">
      <header className="pg-header">
        <div className="pg-header__left">
          <div className="pg-header__icon">💼</div>
          <div>
            <h2 className="pg-header__title">Work</h2>
            <p className="pg-header__subtitle">Quản lý ca làm, phụ thu và tính tiền.</p>
          </div>
        </div>
        <div className="pg-header__actions">
          <button type="button" onClick={() => setIsQuickImportOpen(true)} className="pg-btn pg-btn--primary">
            ⚡ Dán nhanh ca làm
          </button>
          <button type="button" onClick={() => setIsWeekModalOpen(true)} className="pg-btn pg-btn--success">
            🗓️ Thêm ca theo tuần
          </button>
        </div>
      </header>

      {/* Chọn tháng để xem */}
      <div className="pg-monthnav">
        <button
          type="button"
          className="pg-btn pg-btn--ghost pg-monthnav__btn"
          onClick={goPrevMonth}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <div className="pg-monthnav__info">
          <span className="pg-monthnav__month">{monthLabel}</span>
          <span className="pg-monthnav__income">💳 {formatVND(monthIncomeTotal)}</span>
          <span className="pg-monthnav__count">{monthlySummary.shiftCount} ca</span>
        </div>
        <button
          type="button"
          className="pg-btn pg-btn--ghost pg-monthnav__btn"
          onClick={goNextMonth}
          disabled={isCurrentMonth}
          aria-label="Tháng sau"
        >
          ›
        </button>
        {!isCurrentMonth && (
          <button type="button" className="pg-btn pg-btn--sm pg-btn--ghost pg-monthnav__today" onClick={goCurrentMonth}>
            Quay về tháng này
          </button>
        )}
      </div>

      {/* Tổng kết tháng này */}
      <section className="pg-grid">
        <article className="pg-stat">
          <div className="pg-stat__top">
            <p className="pg-stat__label">Giờ làm · {monthShort}</p>
            <span className="pg-stat__icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>⏱️</span>
          </div>
          <div className="pg-rate-inline pg-rate-inline--top">
            <input
              type="number"
              min={0}
              value={rateDraft.NORMAL_RATE ?? ''}
              onChange={(e) => setRateDraft((prev) => ({ ...prev, NORMAL_RATE: e.target.value }))}
              onBlur={() => saveRate('NORMAL_RATE')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              className="pg-input pg-rate-inline__input pg-rate-inline__input--lg"
            />
            <span className="pg-rate-inline__unit">đ/h</span>
          </div>
          <p className="pg-stat__value">{formatHours(monthlySummary.totalHours)}</p>
          <p className="pg-stat__extra pg-stat__extra--income">
            = {formatVND(monthlySummary.normalIncome)}
          </p>
          <p className="pg-stat__extra">{monthlySummary.shiftCount} ca</p>
        </article>
        <article className="pg-stat">
          <div className="pg-stat__top">
            <p className="pg-stat__label">Giờ OT</p>
            <span className="pg-stat__icon" style={{ background: '#fef2f2', color: '#dc2626' }}>🔥</span>
          </div>
          <div className="pg-rate-inline pg-rate-inline--top pg-rate-inline--ro" title="OT = 2 × lương cơ bản">
            <span>{formatK(getOtRate(rates))} đ/h (x2)</span>
          </div>
          <p className="pg-stat__value">{formatHours(monthlySummary.otHours)}</p>
          <p className="pg-stat__extra pg-stat__extra--income">
            = {formatVND(monthlySummary.otIncome)}
          </p>
        </article>
        <article className="pg-stat">
          <div className="pg-stat__top">
            <p className="pg-stat__label">NPC</p>
            <span className="pg-stat__icon" style={{ background: '#eff6ff', color: '#2563eb' }}>💠</span>
          </div>
          <div className="pg-rate-inline pg-rate-inline--top">
            <input
              type="number"
              min={0}
              value={rateDraft.NPC_RATE ?? ''}
              onChange={(e) => setRateDraft((prev) => ({ ...prev, NPC_RATE: e.target.value }))}
              onBlur={() => saveRate('NPC_RATE')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              className="pg-input pg-rate-inline__input pg-rate-inline__input--lg"
            />
            <span className="pg-rate-inline__unit">đ/h</span>
          </div>
          <p className="pg-stat__value pg-stat__value--sm">{formatHours(monthlySummary.npcHours)}</p>
          <p className="pg-stat__extra pg-stat__extra--income">
            = {formatVND(monthlySummary.npcIncome)}
          </p>
        </article>
        <article className="pg-stat">
          <div className="pg-stat__top">
            <p className="pg-stat__label">EXTEND</p>
            <span className="pg-stat__icon" style={{ background: '#fefce8', color: '#ca8a04' }}>➕</span>
          </div>
          <div className="pg-rate-inline pg-rate-inline--top">
            <input
              type="number"
              min={0}
              value={rateDraft.EXTEND_RATE ?? ''}
              onChange={(e) => setRateDraft((prev) => ({ ...prev, EXTEND_RATE: e.target.value }))}
              onBlur={() => saveRate('EXTEND_RATE')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              className="pg-input pg-rate-inline__input pg-rate-inline__input--lg"
            />
            <span className="pg-rate-inline__unit">đ/lần</span>
          </div>
          <p className="pg-stat__value pg-stat__value--sm">{monthlySummary.extendCount} lần</p>
          <p className="pg-stat__extra pg-stat__extra--income">
            = {formatVND(monthlySummary.extendIncome)}
          </p>
        </article>
        <article className="pg-stat">
          <div className="pg-stat__top">
            <p className="pg-stat__label">Thu nhập · {monthShort}</p>
            <span className="pg-stat__icon" style={{ background: '#ecfdf5', color: '#059669' }}>💰</span>
          </div>
          <p className="pg-stat__value">{formatVND(monthIncomeTotal)}</p>
          <p className="pg-stat__extra pg-stat__extra--income">
            Gồm ca {formatVND(monthlySummary.totalIncome)}
            {otherIncomeTotal > 0 ? ` + khác ${formatVND(otherIncomeTotal)}` : ''}
          </p>
        </article>
      </section>

      {/* Thu nhập khác trong tháng (thưởng/phụ cấp nhập tay) */}
      <OtherIncomeCard
        items={monthOtherIncomes}
        monthKey={monthKey}
        monthShort={monthShort}
        monthLabel={monthLabel}
        isLoading={saving}
        onAdd={handleAddOtherIncome}
        onUpdate={handleUpdateOtherIncome}
        onDelete={handleDeleteOtherIncome}
      />

      {/* Thêm ca nhanh theo khung giờ */}
      <section className="pg-card">
        <div className="pg-card__head">
          <div>
            <h3 className="pg-card__title">Thêm ca nhanh theo khung giờ</h3>
            <p className="pg-card__subtitle">Bấm vào một ca để tạo nhanh.</p>
          </div>
        </div>
        <div className="pg-grid">
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
              className="pg-stat pg-stat--clickable"
              style={{ textAlign: 'left', borderColor: '#c6f6d5', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}
            >
              <p className="pg-stat__label">{slot.name}</p>
              <p className="pg-stat__value" style={{ fontSize: '1.35rem', marginTop: '0.5rem' }}>
                {slot.start} - {slot.end}
              </p>
              <p className="pg-stat__extra pg-stat__extra--income">Bấm để thêm ca ➜</p>
            </button>
          ))}
        </div>
      </section>

      {/* Lịch làm tháng này */}
      <section className="pg-card">
        <div className="pg-card__head">
          <div>
            <h3 className="pg-card__title">Lịch làm · {monthShort}</h3>
            <p className="pg-card__subtitle">
              {monthLabel} · Bấm vào ô ca làm để nhập NPC/OT/EXTEND và xem chi tiết.
            </p>
          </div>
        </div>

        {shiftsByDate.size === 0 ? (
          <p className="pg-empty">Chưa có lịch làm trong {monthLabel}.</p>
        ) : (
          <div className="pg-month-table">
            <table>
              <thead>
                <tr>
                  <th className="pg-month-th">Ngày</th>
                  {fixedShifts.map((slot) => (
                    <th key={slot.name} className="pg-month-th">
                      {slot.name} · {slot.start}-{slot.end}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthDays.map((date) => {
                  const dayShifts = shiftsByDate.get(date) ?? []
                  const isToday = date === todayKey
                  return (
                    <tr key={date} className={isToday ? 'pg-month-row--today' : ''}>
                      <td className="pg-month-td pg-month-day">
                        <span className="pg-month-weekday">{getWeekdayShort(date)}</span>
                        <span className="pg-month-date">{formatDay(date)}</span>
                        {isToday ? <span className="pg-month-today-badge">Hôm nay</span> : null}
                      </td>
                      {fixedShifts.map((slot) => {
                        const shift = dayShifts.find((s) => s.shift_type === slot.name)
                        if (!shift) {
                          return (
                            <td key={slot.name} className="pg-month-td pg-month-empty">
                              —
                            </td>
                          )
                        }
                        const money = shiftMoney(shift)
                        return (
                          <td key={slot.name} className="pg-month-td">
                            <div className="pg-month-cell">
                              <button
                                type="button"
                                className="pg-month-cell__main"
                                onClick={() => openShiftMoney(shift)}
                                title={`${slot.name} ${date} · ${shift.scheduled_start}-${shift.scheduled_end} · Tổng ${formatVND(money.total)}`}
                              >
                                <span className="pg-month-cell__money">{formatVND(money.total)}</span>
                                <span className={`pg-month-cell__status ${statusStyle[shift.status] ?? ''}`}>
                                  {statusLabel[shift.status] ?? shift.status}
                                </span>
                              </button>
                              <div className="pg-month-cell__actions">
                                <button type="button" onClick={() => openAddExtra(shift)} title="＋ Phụ thu">＋</button>
                                <button type="button" onClick={() => openEditShift(shift)} title="✏️ Sửa ca">✏️</button>
                                <button type="button" onClick={() => handleQuickDeleteShift(shift)} title="🗑️ Xóa ca">🗑️</button>
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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

      <WorkQuickImportScheduler
        isOpen={isQuickImportOpen}
        onClose={() => setIsQuickImportOpen(false)}
        onDone={load}
        existingShifts={shifts}
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
