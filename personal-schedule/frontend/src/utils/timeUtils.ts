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

export function getTimeRow(time: string) {
  const normalized = time.slice(0, 5)
  const exactIndex = TIME_SLOTS.findIndex((slot) => slot === normalized)
  if (exactIndex >= 0) {
    return exactIndex + 1
  }

  const minutes = timeToMinutes(normalized)
  const fallbackIndex = TIME_SLOTS.reduce((lastIndex, slot, index) => {
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
