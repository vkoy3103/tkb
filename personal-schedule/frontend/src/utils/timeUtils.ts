export const TIME_SLOTS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '12:30',
  '13:30',
  '14:30',
  '15:30',
  '16:30',
  '17:30',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
]

export function timeToMinutes(value: string) {
  const [hourText, minuteText = '0'] = value.split(':')
  const hour = Number.parseInt(hourText, 10)
  const minute = Number.parseInt(minuteText, 10)
  return hour * 60 + minute
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Xây danh sách mốc giờ ĐỘNG cho thời khóa biểu.
 * - Chế độ TIME (theo giờ): base = các GIỜ TRÒN 07:00 → 22:00 (vd ca 13h-18h ra 5 khoảng:
 *   13-14, 14-15, 15-16, 16-17, 17-18). Sau đó chèn thêm MỌI mốc giờ thực tế của ca làm / lịch theo giờ.
 *   Nếu gặp giờ LẺ (phút != 0, vd 13:15) sẽ tự chèn mốc tròn giờ liền trước và sau
 *   (vd 13:00 và 14:00) để tạo hàng "13:00-13:15", "13:15-14:00". KHÔNG còn mốc :30 cố định.
 * - Chế độ PERIOD (theo tiết): base = TIME_SLOTS gốc (có các mốc :30 như 12:30, 13:30...)
 *   để lịch học theo TIẾT khớp đúng vị trí; vẫn chèn thêm giờ lẻ từ ca làm.
 */
export function buildTimeSlots(extraTimes: string[], mode: 'TIME' | 'PERIOD' = 'TIME'): string[] {
  const set = new Set<string>()
  if (mode === 'PERIOD') {
    TIME_SLOTS.forEach((slot) => set.add(slot))
  } else {
    // Base: giờ tròn 07:00 → 22:00
    for (let hour = 7; hour <= 22; hour++) {
      set.add(minutesToTime(hour * 60))
    }
  }
  for (const t of extraTimes) {
    if (!t) continue
    const normalized = t.slice(0, 5)
    const minutes = timeToMinutes(normalized)
    if (minutes < timeToMinutes('07:00') || minutes > timeToMinutes('22:00')) continue
    set.add(normalized)
    // Giờ lẻ (phút != 0): chèn mốc tròn giờ liền trước + liền sau để tách hàng rõ ràng
    if (minutes % 60 !== 0) {
      const floor = minutes - (minutes % 60)
      const ceil = floor + 60
      if (floor >= timeToMinutes('07:00') && floor <= timeToMinutes('22:00')) set.add(minutesToTime(floor))
      if (ceil >= timeToMinutes('07:00') && ceil <= timeToMinutes('22:00')) set.add(minutesToTime(ceil))
    }
  }
  return Array.from(set).sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
}

export function getTimeRow(time: string, slots: string[] = TIME_SLOTS) {
  const normalized = time.slice(0, 5)
  const exactIndex = slots.findIndex((slot) => slot === normalized)
  if (exactIndex >= 0) {
    return exactIndex + 1
  }

  const minutes = timeToMinutes(normalized)
  const fallbackIndex = slots.reduce((lastIndex, slot, index) => {
    if (timeToMinutes(slot) <= minutes) {
      return index
    }
    return lastIndex
  }, 0)

  return fallbackIndex + 1
}

export function getTimeDifference(startTime: string, endTime: string) {
  return timeToMinutes(endTime) - timeToMinutes(startTime)
}

export function getGridRowRange(startTime: string, endTime: string) {
  const startRow = getTimeRow(startTime)
  const endRow = getTimeRow(endTime)
  return [startRow, Math.max(startRow + 1, endRow)] as const
}
