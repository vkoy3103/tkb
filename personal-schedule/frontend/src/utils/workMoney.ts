import type { SettingsEntry, WorkExtra, WorkShift } from '../types'
import { getOtRate } from './salary'

function toMinutes(value?: string | null): number | null {
  if (!value) return null
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export function calcNormalHours(shift: WorkShift): number {
  if (shift.status === 'cancelled') return 0
  const scheduledStart = toMinutes(shift.scheduled_start)
  const scheduledEnd = toMinutes(shift.scheduled_end)
  if (scheduledStart == null || scheduledEnd == null) return 0
  const start = toMinutes(shift.actual_start) ?? scheduledStart
  const actualEnd = toMinutes(shift.actual_end) ?? scheduledEnd
  const normalEnd = Math.min(actualEnd, scheduledEnd)
  return Math.max(0, (normalEnd - start) / 60)
}

export function calcOtHours(shift: WorkShift, otStartMinutes: number): number {
  if (shift.status === 'cancelled') return 0
  const scheduledEnd = toMinutes(shift.scheduled_end)
  if (scheduledEnd == null) return 0
  const actualEnd = toMinutes(shift.actual_end) ?? scheduledEnd
  const start = Math.max(scheduledEnd, otStartMinutes)
  if (actualEnd <= start) return 0
  return Math.max(0, (actualEnd - start) / 60)
}

export function getOtStartMinutes(settings: SettingsEntry[]): number {
  const raw = settings.find((s) => s.key === 'OT_START_TIME')?.value
  if (raw) {
    const [h, m] = raw.split(':').map(Number)
    if (!Number.isNaN(h)) return h * 60 + (m || 0)
  }
  return 22 * 60
}

export type ShiftMoney = {
  normalHours: number
  otHours: number
  npcHours: number
  extendCount: number
  normalIncome: number
  otIncome: number
  npcIncome: number
  extendIncome: number
  total: number
}

// Tính tiền cho 1 ca làm. Mọi đơn giá lấy từ `rates` (đã map từ settings).
// OT LUÔN = 2 x NORMAL_RATE (qua getOtRate). Không dùng amount lưu sẵn — tránh lệch khi đổi lương.
export function calcShiftMoney(
  shift: WorkShift,
  extras: WorkExtra[],
  rates: Record<string, number>,
  otStartMinutes: number,
): ShiftMoney {
  const normalHours = calcNormalHours(shift)
  let otHours = calcOtHours(shift, otStartMinutes)
  let normalIncome = normalHours * (rates.NORMAL_RATE ?? 0)
  const otRate = getOtRate(rates)
  let otIncome = otHours * otRate
  let npcHours = 0
  let npcIncome = 0
  let extendCount = 0
  let extendIncome = 0

  for (const extra of extras ?? []) {
    const qty = extra.quantity ?? 0
    if (extra.type === 'NPC') {
      npcHours += qty
      npcIncome += qty * (rates.NPC_RATE ?? 0)
    } else if (extra.type === 'EXTEND') {
      extendCount += qty
      extendIncome += qty * (rates.EXTEND_RATE ?? 0)
    } else {
      // OT
      otHours += qty
      otIncome += qty * otRate
    }
  }

  return {
    normalHours,
    otHours,
    npcHours,
    extendCount,
    normalIncome,
    otIncome,
    npcIncome,
    extendIncome,
    total: normalIncome + otIncome + npcIncome + extendIncome,
  }
}
