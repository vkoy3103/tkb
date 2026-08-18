import type { SettingsEntry } from '../types'

// Chuyển danh sách settings (key/value dạng chuỗi) thành bảng đơn giá số.
// QUY TẮC DUY NHẤT: OT luôn = 2 x NORMAL_RATE (x2 lương cơ bản).
// Mọi nơi tính lương (Dashboard, Work, ShiftMoneyEditor, ...) phải dùng hàm này
// để đảm bảo dữ liệu lương lấy từ settings và OT đồng bộ = 2x lương thường.
export function settingsToRates(settings: SettingsEntry[]): Record<string, number> {
  const map: Record<string, number> = {}
  settings.forEach((s) => {
    if (s.key) {
      const value = Number(s.value)
      if (!Number.isNaN(value)) map[s.key] = value
    }
  })
  map.OT_RATE = 2 * (map.NORMAL_RATE ?? 0)
  return map
}

// Lấy đơn giá OT. Ưu tiên giá trị đã được settingsToRates tính (2 x NORMAL_RATE),
// fallback an toàn nếu gọi trên map thô.
export function getOtRate(rates: Record<string, number>): number {
  return rates.OT_RATE ?? 2 * (rates.NORMAL_RATE ?? 0)
}
