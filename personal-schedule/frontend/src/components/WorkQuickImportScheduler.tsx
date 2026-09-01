import { useEffect, useMemo, useState } from 'react'
import { createWorkShift } from '../services/workShiftApi'
import type { WorkShift } from '../types'
import '../styles/quick-import.css'

interface WorkQuickImportSchedulerProps {
  isOpen: boolean
  onClose: () => void
  onDone: () => Promise<void>
  existingShifts?: WorkShift[]
}

interface ParsedShift {
  date: string // YYYY-MM-DD
  shift_type: string // SHIFT 1 | SHIFT 2 | SHIFT 3
  scheduled_start: string
  scheduled_end: string
  note: string
}

// 3 ca cố định (dùng khi header không đọc được giờ)
const DEFAULT_SHIFTS = [
  { type: 'SHIFT 1', start: '09:00', end: '13:00' },
  { type: 'SHIFT 2', start: '13:00', end: '18:00' },
  { type: 'SHIFT 3', start: '18:00', end: '22:00' },
]

// Đổi "HH:MM" → số phút (để so trùng giờ)
function toMinutes(value?: string | null): number | null {
  if (!value) return null
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

// Khoảng thời gian của 1 ca (để so trùng)
function shiftRange(s: { scheduled_start: string; scheduled_end: string }): { start: number; end: number } | null {
  const start = toMinutes(s.scheduled_start)
  const end = toMinutes(s.scheduled_end)
  if (start == null || end == null) return null
  return { start, end }
}

// Bỏ dấu tiếng Việt để so khớp tên không phân biệt hoa/thường
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/** Kiểm tra 1 ô có chứa tên cần tìm không (so khớp cả họ tên đầy đủ). */
function cellMatches(cell: string, name: string): boolean {
  const c = normalizeName(cell)
  const n = normalizeName(name)
  if (!c || !n) return false
  // Khớp chính xác cả ô, hoặc tên là 1 từ trong ô (vd "X. Huy" vs "Huy")
  if (c === n) return true
  const tokens = c.split(/[\s.]+/).filter(Boolean)
  return tokens.some((t) => t === n)
}

/** Trích giờ từ nhãn "1st SHIFT (09:00-13:00)". */
function extractShiftTime(label: string): { start: string; end: string } | null {
  const match = label.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
  if (!match) return null
  return { start: match[1].slice(0, 5), end: match[2].slice(0, 5) }
}

/** Tìm index cột của từng nhãn trong dòng header. */
interface HeaderMap {
  idx1st: number
  idx2nd: number
  idx3rd: number
  idxNpc: number
}

function findHeader(parts: string[]): HeaderMap | null {
  let idx1st = -1
  let idx2nd = -1
  let idx3rd = -1
  let idxNpc = -1
  parts.forEach((p, i) => {
    const low = p.toLowerCase()
    if (idx1st < 0 && low.includes('1st shift')) idx1st = i
    if (idx2nd < 0 && low.includes('2nd shift')) idx2nd = i
    if (idx3rd < 0 && low.includes('3rd shift')) idx3rd = i
    if (idxNpc < 0 && /^npc$/i.test(p.trim())) idxNpc = i
  })
  if (idx1st < 0 || idx2nd < 0 || idx3rd < 0) return null
  if (idxNpc < 0) idxNpc = idx3rd + 4
  return { idx1st, idx2nd, idx3rd, idxNpc }
}

/** Trích ngày "Monday (17/08)" -> { day, month } | null */
function parseDayLine(line: string): { day: number; month: number } | null {
  const trimmed = line.trim()
  // Dạng tiếng Anh: "Monday (17/08)" / "MONDAY (17/08)"
  const enMatch = trimmed.match(/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*\(\s*(\d{1,2})\/(\d{1,2})\s*\)/i)
  if (enMatch) return { day: Number(enMatch[1]), month: Number(enMatch[2]) }
  // Dạng tiếng Việt: "Thứ 2 (17/08)" / "Chủ nhật (17/08)"
  const viMatch = trimmed.match(/^(?:thứ\s*\d|chủ\s+nhật|cn)\s*\(\s*(\d{1,2})\/(\d{1,2})\s*\)/i)
  if (viMatch) return { day: Number(viMatch[1]), month: Number(viMatch[2]) }
  return null
}

/** Dòng tiêu đề cơ sở: "CƠ SỞ 1: 377 NGÔ QUYỀN" / "CƠ SỞ 2: ..." */
function parseBaseLine(line: string): string | null {
  const m = line.trim().match(/^cơ\s*sở\s*\d+/i)
  return m ? line.trim() : null
}

function formatYMD(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Parse toàn bộ bảng ca làm dán nhanh.
 * Cấu trúc header: DATE | 1st SHIFT (09:00-13:00) | 2nd SHIFT (13:00-18:00) | 3rd SHIFT (18:00-22:00) | NPC | OT | CHẠY CS
 */
function parseWorkTable(raw: string, name: string, year: number): ParsedShift[] {
  // Giờ từng ca (đọc từ header nếu có, fallback mặc định)
  const shiftTimes = DEFAULT_SHIFTS.map((s) => ({ ...s }))

  const lines = raw.split(/\r?\n/)
  let header: HeaderMap | null = null
  let currentBase = ''
  const results: ParsedShift[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Dòng cơ sở
    const base = parseBaseLine(line)
    if (base) {
      currentBase = base
      continue
    }

    const parts = line.split('\t').map((p) => p.trim())

    // Dòng header chứa các nhãn shift
    if (!header && parts.some((p) => /shift/i.test(p))) {
      const h = findHeader(parts)
      if (h) {
        header = h
        // Cập nhật giờ theo nhãn header nếu có
        const t1 = extractShiftTime(parts[h.idx1st])
        if (t1) {
          shiftTimes[0].start = t1.start
          shiftTimes[0].end = t1.end
        }
        const t2 = extractShiftTime(parts[h.idx2nd])
        if (t2) {
          shiftTimes[1].start = t2.start
          shiftTimes[1].end = t2.end
        }
        const t3 = extractShiftTime(parts[h.idx3rd])
        if (t3) {
          shiftTimes[2].start = t3.start
          shiftTimes[2].end = t3.end
        }
      }
      continue
    }

    // Dòng ngày
    const dayInfo = parseDayLine(trimmed)
    if (!dayInfo) continue
    if (dayInfo.month < 1 || dayInfo.month > 12 || dayInfo.day < 1 || dayInfo.day > 31) continue

    const dateStr = formatYMD(dayInfo.day, dayInfo.month, year)

    // Nếu chưa có header, dùng mốc cột mặc định
    const h = header ?? { idx1st: 1, idx2nd: 5, idx3rd: 9, idxNpc: 13 }

    // Vùng cột từng shift
    const zones: { type: string; from: number; to: number; start: string; end: string }[] = [
      { type: 'SHIFT 1', from: h.idx1st, to: h.idx2nd - 1, start: shiftTimes[0].start, end: shiftTimes[0].end },
      { type: 'SHIFT 2', from: h.idx2nd, to: h.idx3rd - 1, start: shiftTimes[1].start, end: shiftTimes[1].end },
      { type: 'SHIFT 3', from: h.idx3rd, to: h.idxNpc - 1, start: shiftTimes[2].start, end: shiftTimes[2].end },
    ]

    for (const zone of zones) {
      const names = []
      for (let i = zone.from; i <= zone.to && i < parts.length; i++) {
        const cell = parts[i]
        if (cell && !/^(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}|\d+\s*h|phụ|npc|ot)/i.test(cell)) {
          names.push(cell)
        }
      }
      if (names.length === 0) continue
      const hasName = names.some((cell) => cellMatches(cell, name))
      if (!hasName) continue

      const key = `${dateStr}|${zone.type}`
      if (seen.has(key)) continue
      seen.add(key)

      results.push({
        date: dateStr,
        shift_type: zone.type,
        scheduled_start: zone.start,
        scheduled_end: zone.end,
        note: currentBase,
      })
    }
  }

  return results
}

export function WorkQuickImportScheduler({
  isOpen,
  onClose,
  onDone,
  existingShifts = [],
}: WorkQuickImportSchedulerProps): React.ReactElement | null {
  const [name, setName] = useState('')
  const [rawText, setRawText] = useState('')
  const [rows, setRows] = useState<ParsedShift[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successCount, setSuccessCount] = useState(0)
  const [skipped, setSkipped] = useState<Set<number>>(new Set()) // các ca trùng được user chọn bỏ qua

  useEffect(() => {
    if (isOpen) {
      setName('')
      setRawText('')
      setRows([])
      setError('')
      setSuccessCount(0)
      setSkipped(new Set())
    }
  }, [isOpen])

  const year = useMemo(() => new Date().getFullYear(), [])

  // Các ca bị TRÙNG thời gian (giữa các ca dán với nhau hoặc với ca hiện có)
  const conflictIndices = useMemo(() => {
    const conflict = new Set<number>()
    const ranges = rows.map(shiftRange)
    for (let i = 0; i < rows.length; i++) {
      const ri = ranges[i]
      if (!ri) continue
      // Trùng với ca khác trong bảng dán (cùng ngày + giờ giao nhau)
      for (let j = i + 1; j < rows.length; j++) {
        const rj = ranges[j]
        if (!rj) continue
        if (rows[i].date === rows[j].date && ri.start < rj.end && rj.start < ri.end) {
          conflict.add(i)
          conflict.add(j)
        }
      }
      // Trùng với ca làm hiện có
      for (const s of existingShifts) {
        if (s.date !== rows[i].date) continue
        const sr = shiftRange(s)
        if (sr && ri.start < sr.end && sr.start < ri.end) {
          conflict.add(i)
        }
      }
    }
    return conflict
  }, [rows, existingShifts])

  // Nếu 1 ca được sửa thành hết trùng → tự bỏ chọn "Bỏ qua"
  useEffect(() => {
    setSkipped((prev) => {
      if (prev.size === 0) return prev
      const next = new Set([...prev].filter((i) => conflictIndices.has(i)))
      return next.size === prev.size ? prev : next
    })
  }, [conflictIndices])

  const handleAnalyze = () => {
    setError('')
    setSuccessCount(0)
    setSkipped(new Set())
    if (!name.trim()) {
      setError('Vui lòng nhập tên người cần lọc ca làm.')
      setRows([])
      return
    }
    const parsed = parseWorkTable(rawText, name.trim(), year)
    setRows(parsed)
    if (parsed.length === 0) {
      setError('Không tìm thấy ca làm nào cho tên này. Hãy kiểm tra lại tên hoặc bảng đã dán.')
    }
  }

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, i) => i !== index))
  }

  const toggleSkip = (i: number) => {
    setSkipped((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const skipAllConflicts = () => setSkipped(new Set([...conflictIndices]))
  const clearSkipped = () => setSkipped(new Set())

  const addableRows = rows.filter((_, i) => !skipped.has(i))

  const handleSave = async () => {
    if (addableRows.length === 0) {
      setError('Chưa có ca làm nào để thêm. Vui lòng kiểm tra lại.')
      return
    }
    setSaving(true)
    setError('')
    let count = 0
    try {
      for (const row of addableRows) {
        await createWorkShift({
          date: row.date,
          shift_type: row.shift_type,
          scheduled_start: row.scheduled_start,
          scheduled_end: row.scheduled_end,
          status: 'scheduled',
          note: row.note || null,
        })
        count += 1
      }
      setSuccessCount(count)
      setRows([])
      setRawText('')
      setName('')
      await onDone()
    } catch (err) {
      setError(`Có lỗi khi lưu (đã thêm ${count} ca): ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="schedule-modal-backdrop" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="schedule-modal quick-import">
        <div className="schedule-modal__header">
          <h2 className="schedule-modal__title">⚡ Dán nhanh ca làm (Work)</h2>
          <button type="button" className="schedule-modal__close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="schedule-modal__content">
          <div className="quick-import__hint">
            <b>💡 Cách dùng:</b> dán bảng ca làm (có header{' '}
            <code>1st SHIFT | 2nd SHIFT | 3rd SHIFT</code>) vào ô bên dưới, nhập <b>TÊN</b> người cần lọc. App sẽ lọc
            ra những ngày + ca mà người đó làm rồi thêm vào lịch. Không cần quan tâm cột <code>CHẠY CS</code>,{' '}
            <code>NPC</code>, <code>OT</code>.
          </div>

          <div className="quick-import__format">
            <div>
              Định dạng bảng:{' '}
              <code>
                DATE | 1st SHIFT (09:00-13:00) | 2nd SHIFT (13:00-18:00) | 3rd SHIFT (18:00-22:00) | NPC | OT | CHẠY CS
              </code>
            </div>
            <div className="quick-import__format-example">
              VD: <code>Monday (17/08) | Phước | Lâm | ... | Phước | Lena | Nam | ... | An | Nam | ...</code>
            </div>
            <div className="quick-import__format-example">
              💡 Nhập tên (vd <b>Phước</b>) → app tìm ra <b>SHIFT 1 ngày 17/08</b> nếu tên Phước có trong ca đó.
            </div>
          </div>

          <label className="quick-import__name-label">
            <span>Tên người cần lọc:</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Phước, Lena, X. Huy..."
              className="quick-import__name-input"
            />
          </label>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="quick-import__textarea"
            placeholder={
              'Paste bảng ca làm vào đây...\n\nCƠ SỞ 1: 377 NGÔ QUYỀN\nDATE\t1st SHIFT (09:00-13:00)\t\t\t\t2nd SHIFT (13:00-18:00)\t\t\t\t3rd SHIFT (18:00-22:00)\t\t\t\tNPC\tOT\tCHẠY CS\nMonday (17/08)\tPhước\tLâm\t\t\t\tPhước\tLena\tNam\tPhước\t\tAn\tNam\t\t3h: PHƯỚC\t'
            }
            rows={8}
          />

          <div className="quick-import__toolbar">
            <button type="button" className="pg-btn pg-btn--primary" onClick={handleAnalyze} disabled={saving}>
              🔍 Phân tích
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--success"
              onClick={handleSave}
              disabled={saving || addableRows.length === 0}
            >
              {saving ? 'Đang lưu...' : `➕ Thêm ${addableRows.length} ca làm`}
            </button>
          </div>

          {error && <div className="schedule-alert">{error}</div>}
          {successCount > 0 && (
            <div className="quick-import__success">✅ Đã thêm {successCount} ca làm thành công!</div>
          )}

          {conflictIndices.size > 0 && (
            <div className="quick-import__conflict">
              <div className="quick-import__conflict-title">
                ⚠️ Phát hiện <b>{conflictIndices.size}</b> ca làm bị <b>trùng thời gian</b> (với ca làm hiện có hoặc
                giữa các ca với nhau). Các dòng đỏ bên dưới — tick <b>Bỏ qua</b> nếu không muốn thêm.
              </div>
              <div className="quick-import__conflict-actions">
                <button type="button" className="pg-btn pg-btn--sm pg-btn--ghost" onClick={skipAllConflicts}>
                  Bỏ qua tất cả ca trùng
                </button>
                <button type="button" className="pg-btn pg-btn--sm pg-btn--ghost" onClick={clearSkipped}>
                  Thêm tất cả
                </button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="quick-import__preview">
              <div className="quick-import__preview-title">Bảng xem trước — các ca làm của {name || '...'}</div>
              <table className="quick-import__table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Ca</th>
                    <th>Giờ</th>
                    <th>Cơ sở</th>
                    <th>⚠️</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={conflictIndices.has(i) ? 'quick-import__row--conflict' : ''}>
                      <td>{row.date}</td>
                      <td>{row.shift_type}</td>
                      <td>
                        {row.scheduled_start} – {row.scheduled_end}
                      </td>
                      <td>{row.note || '—'}</td>
                      <td>
                        {conflictIndices.has(i) ? (
                          <label className="quick-import__skip">
                            <input type="checkbox" checked={skipped.has(i)} onChange={() => toggleSkip(i)} />
                            Bỏ qua
                          </label>
                        ) : null}
                      </td>
                      <td>
                        <button type="button" className="quick-import__remove" onClick={() => removeRow(i)} title="Xóa ca này">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
