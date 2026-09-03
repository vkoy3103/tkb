import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { Period, Schedule, Subject } from '../types'
import { createSchedulesBulk } from '../services/scheduleApi'
import { createSubjectsBulk } from '../services/subjectApi'
import '../styles/quick-import.css'

interface QuickImportSchedulerProps {
  isOpen: boolean
  onClose: () => void
  onDone: () => Promise<void>
  existingSchedules?: Schedule[]
  periods?: Period[]
}

interface ParsedRow {
  code: string
  name: string
  credits: number
  teacher: string
  room: string
  weekday: number | ''
  start_period: number | ''
  end_period: number | ''
  start_time: string
  end_time: string
  week_start: number | ''
  week_end: number | ''
  color: string
}

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#F59E0B',
  '#0EA5E9',
]

// Prompt mẫu gửi ChatGPT — format theo chế độ của user
const PERIOD_PROMPT = `Bạn là trợ lý xử lý dữ liệu lịch học. Tôi sẽ dán dữ liệu lịch học bất kỳ (từ portal trường, Excel...). Hãy trích xuất từng môn học và xuất MỘT DÒNG cho mỗi môn, dùng dấu | để ngăn cách 6 cột theo đúng thứ tự:

Mã môn | Tên | Số TC | Giảng viên | Thứ X,tiết-đầu-tiết-cuối,phòng | tuần-đầu-tuần-cuối

Quy tắc:
1. Cột nào không có thông tin thì để trống (vẫn giữ đủ dấu |).
2. Thứ X: X là số 2..8 (2=Thứ 2 ... 8=Chủ nhật). Nếu dữ liệu không cho biết thứ, để trống.
3. tiết-đầu-tiết-cuối: dạng số tiết (vd 1-2). Nếu dữ liệu chỉ có giờ (07:00-09:00) hãy GIỮ NGUYÊN khoảng giờ đó (vd Thứ 2,07:00-09:00,P.101).
4. phòng: tên phòng học (vd P.101).
5. tuần-đầu-tuần-cuối: dạng 1-16. Nếu không biết thì để trống.
6. Bỏ qua dòng rác, dòng trống, môn trùng (cùng mã + cùng giờ/phòng).
7. CHỈ trả về các dòng dữ liệu, không giải thích, không markdown.

Dữ liệu của tôi:
`

const TIME_PROMPT = `Bạn là trợ lý xử lý dữ liệu lịch học. Tôi sẽ dán dữ liệu lịch học bất kỳ (từ portal trường, Excel...). Hãy trích xuất từng môn học và xuất MỘT DÒNG cho mỗi môn, dùng dấu | để ngăn cách 5 cột theo đúng thứ tự:

Mã môn | Tên | Thứ | Phòng | Giờ

Quy tắc:
1. Cột nào không có thông tin thì để trống (vẫn giữ đủ dấu |).
2. Thứ: 2=Thứ 2 ... 8=Chủ nhật (viết dạng "Thứ 2" hoặc số 2..8). Bắt buộc phải xác định được thứ nếu dữ liệu có (trong bảng thời khóa biểu thường có tiêu đề cột Thứ 2, Thứ 3...). Nếu không có thông tin thứ, để trống.
3. Giờ: dạng "HH:MM-HH:MM" (vd 07:00-09:00). Nếu dữ liệu có số tiết (vd 1-2) hãy quy đổi sang giờ theo khung tiết thường (1=07:00-08:00, 2=08:00-09:00, 3=09:00-10:00, 4=10:00-11:00, 5=11:00-12:00, 6=12:30-13:30, 7=13:30-14:30, 8=14:30-15:30, 9=15:30-16:30, 10=16:30-17:30). Nếu không suy ra được thì để trống.
4. phòng: tên phòng học (vd P.101).
5. Bỏ qua dòng rác, dòng trống, môn trùng (cùng mã + cùng giờ/phòng).
6. CHỈ trả về các dòng dữ liệu, không giải thích, không markdown.

Dữ liệu của tôi:
`

function parseWeekRange(value: string): { start: number | ''; end: number | '' } {
  const match = value.trim().match(/^(\d+)\s*-\s*(\d+)$/)
  if (!match) return { start: '', end: '' }
  return { start: Number(match[1]), end: Number(match[2]) }
}

/** Trích số tiết từ chuỗi dạng "1-2" hoặc "tiết 1-2". */
function parsePeriodRange(value: string): { start: number | ''; end: number | '' } {
  const match = value.trim().match(/(\d+)\s*[-–]\s*(\d+)/)
  if (!match) return { start: '', end: '' }
  return { start: Number(match[1]), end: Number(match[2]) }
}

/** Trích khoảng giờ "07:00-09:00" từ chuỗi. */
function extractTimeRange(value: string): { start: string; end: string } {
  const match = value.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
  if (!match) return { start: '', end: '' }
  return { start: match[1].slice(0, 5), end: match[2].slice(0, 5) }
}

function parsePipeLine(parts: string[], index: number): ParsedRow | null {
  if (parts.filter((p) => p).length === 0) return null

  // Format 5 cột TIME: Mã | Tên | Thứ | Phòng | Giờ
  if (
    parts.length >= 5 &&
    /^(thứ\s*)?[2-8]$/i.test(parts[2]) &&
    /\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(parts[4])
  ) {
    const code = parts[0] ?? ''
    const name = parts[1] ?? ''
    const dayMatch = parts[2].match(/(\d+)/)
    const weekday = dayMatch ? Number(dayMatch[1]) : ''
    const room = parts[3] ?? ''
    const time = extractTimeRange(parts[4])
    if (!name) return null
    return {
      code,
      name: name || `Môn ${index + 1}`,
      credits: 0,
      teacher: '',
      room,
      weekday,
      start_period: '',
      end_period: '',
      start_time: time.start,
      end_time: time.end,
      week_start: '',
      week_end: '',
      color: COLORS[index % COLORS.length],
    }
  }

  // Format 4 cột: Mã | Tên | Phòng | Giờ  (không có thứ)
  if (parts.length >= 4 && /\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(parts[3])) {
    const code = parts[0] ?? ''
    const name = parts[1] ?? ''
    const room = parts[2] ?? ''
    const time = extractTimeRange(parts[3])
    if (!name) return null
    return {
      code,
      name: name || `Môn ${index + 1}`,
      credits: 0,
      teacher: '',
      room,
      weekday: '',
      start_period: '',
      end_period: '',
      start_time: time.start,
      end_time: time.end,
      week_start: '',
      week_end: '',
      color: COLORS[index % COLORS.length],
    }
  }

  // Format 6 cột ChatGPT: Mã | Tên | TC | GV | Thứ X,tiết/giờ,phòng | tuần
  const code = parts[0] ?? ''
  const name = parts[1] ?? ''
  const creditsRaw = parts[2] ?? ''
  const teacher = parts[3] ?? ''
  const scheduleRaw = parts[4] ?? ''
  const weekRaw = parts[5] ?? ''

  const schedParts = scheduleRaw.split(',').map((p) => p.trim())
  let weekday: number | '' = ''
  let start_period: number | '' = ''
  let end_period: number | '' = ''
  let start_time = ''
  let end_time = ''
  let room = ''
  const dayMatch = schedParts[0]?.match(/(\d+)/)
  if (dayMatch) weekday = Number(dayMatch[1])

  // Nếu phần thứ 2 là khoảng giờ -> lưu GIỜ; ngược lại là số tiết
  if (schedParts[1] && /\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(schedParts[1])) {
    const t = extractTimeRange(schedParts[1])
    start_time = t.start
    end_time = t.end
  } else {
    const pr = parsePeriodRange(schedParts[1] ?? '')
    start_period = pr.start
    end_period = pr.end
  }
  room = schedParts.slice(2).join(',').trim()

  if (!name) return null

  const weeks = parseWeekRange(weekRaw)

  return {
    code,
    name: name || `Môn ${index + 1}`,
    credits: creditsRaw ? Number(creditsRaw) || 0 : 0,
    teacher,
    room,
    weekday,
    start_period,
    end_period,
    start_time,
    end_time,
    week_start: weeks.start,
    week_end: weeks.end,
    color: COLORS[index % COLORS.length],
  }
}

function parseLine(line: string, index: number): ParsedRow | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  // Bỏ dòng tiêu đề
  if (/^(stt|tt|mã|mã môn|tên|số tc|giảng viên|giáo viên)/i.test(trimmed)) return null

  // Format có dấu |
  if (trimmed.includes('|')) {
    return parsePipeLine(trimmed.split('|').map((p) => p.trim()), index)
  }

  // Format tab / 2+ khoảng trắng (portal trường, Excel)
  const parts = trimmed.includes('\t')
    ? trimmed.split('\t').map((p) => p.trim())
    : trimmed.split(/\s{2,}/).map((p) => p.trim())

  const scheduleIdx = parts.findIndex((p) => /thứ\s*\d+/i.test(p))
  if (scheduleIdx < 0) return null

  const code = parts[1] ?? ''
  const name = parts[2] ?? parts[scheduleIdx - 2] ?? ''
  const creditsRaw = parts[3] ?? ''
  const teacher = parts[scheduleIdx - 1] ?? ''
  const weekRaw = parts[scheduleIdx + 1] ?? ''

  const scheduleParts = parts[scheduleIdx].split(',')
  const dayMatch = scheduleParts[0]?.match(/(\d+)/)
  const weekday = dayMatch ? Number(dayMatch[1]) : ''
  let start_period: number | '' = ''
  let end_period: number | '' = ''
  let start_time = ''
  let end_time = ''
  if (scheduleParts[1] && /\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(scheduleParts[1].trim())) {
    const t = extractTimeRange(scheduleParts[1].trim())
    start_time = t.start
    end_time = t.end
  } else {
    const periodMatch = scheduleParts[1]?.trim().match(/^(\d+)\s*-\s*(\d+)$/)
    if (periodMatch) {
      start_period = Number(periodMatch[1])
      end_period = Number(periodMatch[2])
    }
  }
  const room = scheduleParts.slice(2).join(',').trim()

  const weeks = parseWeekRange(weekRaw)

  return {
    code,
    name: name || `Môn ${index + 1}`,
    credits: creditsRaw ? Number(creditsRaw) || 0 : 0,
    teacher,
    room,
    weekday,
    start_period,
    end_period,
    start_time,
    end_time,
    week_start: weeks.start,
    week_end: weeks.end,
    color: COLORS[index % COLORS.length],
  }
}

// Đổi "HH:MM" → số phút (để so trùng giờ)
function toMinute(value?: string | null): number {
  if (!value) return 0
  const [h, m] = value.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Khoảng thời gian của 1 dòng dán nhanh (giờ hoặc tiết → giờ), null nếu chưa đủ thông tin
function rowTimeRange(row: ParsedRow, periodsMap: Map<number, Period>): { start: number; end: number } | null {
  if (row.start_time && row.end_time) {
    return { start: toMinute(row.start_time), end: toMinute(row.end_time) }
  }
  if (row.start_period !== '' && row.end_period !== '') {
    const sp = periodsMap.get(Number(row.start_period))
    const ep = periodsMap.get(Number(row.end_period))
    if (sp && ep) return { start: toMinute(sp.start_time), end: toMinute(ep.end_time) }
  }
  return null
}

// Khoảng thời gian của 1 lịch học hiện có (để so trùng)
function scheduleTimeRange(s: Schedule, periodsMap: Map<number, Period>): { start: number; end: number } | null {
  if (s.start_time && s.end_time) {
    return { start: toMinute(s.start_time), end: toMinute(s.end_time) }
  }
  if (s.start_period != null && s.end_period != null) {
    const sp = periodsMap.get(Number(s.start_period))
    const ep = periodsMap.get(Number(s.end_period))
    if (sp && ep) return { start: toMinute(sp.start_time), end: toMinute(ep.end_time) }
  }
  return null
}

export function QuickImportScheduler({
  isOpen,
  onClose,
  onDone,
  existingSchedules = [],
  periods = [],
}: QuickImportSchedulerProps): React.ReactElement | null {
  const { scheduleMode } = useAuth()
  const isTimeMode = scheduleMode === 'TIME'
  const [rawText, setRawText] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successCount, setSuccessCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [skipped, setSkipped] = useState<Set<number>>(new Set()) // các dòng trùng được user chọn bỏ qua

  useEffect(() => {
    if (isOpen) {
      setRawText('')
      setRows([])
      setError('')
      setSuccessCount(0)
      setSkipped(new Set())
    }
  }, [isOpen])

  const parsed = useMemo(() => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim())
    return lines.map((line, i) => parseLine(line, i)).filter((r): r is ParsedRow => r !== null)
  }, [rawText])

  // Bản đồ tiết → khung giờ (để quy đổi tiết sang giờ khi so trùng)
  const periodsMap = useMemo(() => new Map(periods.map((p) => [p.period_number, p])), [periods])

  // Các dòng bị TRÙNG thời gian (giữa các dòng với nhau hoặc với lịch hiện có)
  const conflictIndices = useMemo(() => {
    const conflict = new Set<number>()
    const ranges = rows.map((row) => rowTimeRange(row, periodsMap))
    for (let i = 0; i < rows.length; i++) {
      const wd = rows[i].weekday
      const ri = ranges[i]
      if (wd === '' || !ri) continue
      // Trùng với dòng khác trong bảng dán
      for (let j = i + 1; j < rows.length; j++) {
        const rj = ranges[j]
        if (rows[j].weekday !== wd || !rj) continue
        if (ri.start < rj.end && rj.start < ri.end) {
          conflict.add(i)
          conflict.add(j)
        }
      }
      // Trùng với lịch học hiện có
      for (const s of existingSchedules) {
        if (Number(s.weekday) !== Number(wd)) continue
        const sr = scheduleTimeRange(s, periodsMap)
        if (sr && ri.start < sr.end && sr.start < ri.end) {
          conflict.add(i)
        }
      }
    }
    return conflict
  }, [rows, existingSchedules, periodsMap])

  // Nếu 1 dòng được sửa thành hết trùng → tự bỏ chọn "Bỏ qua" cho nó
  useEffect(() => {
    setSkipped((prev) => {
      if (prev.size === 0) return prev
      const next = new Set([...prev].filter((i) => conflictIndices.has(i)))
      return next.size === prev.size ? prev : next
    })
  }, [conflictIndices])

  const updateRow = (index: number, patch: Partial<ParsedRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const handleAnalyze = () => {
    setRows(parsed)
    setError('')
    setSuccessCount(0)
    setSkipped(new Set())
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

  const copyPrompt = () => {
    const prompt = isTimeMode ? TIME_PROMPT : PERIOD_PROMPT
    navigator.clipboard
      ?.writeText(prompt)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setError('Không copy được. Hãy copy thủ công đoạn prompt bên dưới.'))
  }

  const addableRows = rows.filter((row, i) => !skipped.has(i) && row.name.trim())
  const scheduleReadyRows = rows.filter(
    (row, i) =>
      !skipped.has(i) &&
      row.name &&
      row.weekday !== '' &&
      ((row.start_period !== '' && row.end_period !== '') || (row.start_time !== '' && row.end_time !== '')),
  )

  const handleSave = async () => {
    if (addableRows.length === 0) {
      setError('Chưa có môn học nào để thêm. Vui lòng kiểm tra lại.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // 1) Tạo TOÀN BỘ môn học trong 1 request (nhanh hơn nhiều so với từng môn)
      const subjectPayloads: Array<Omit<Subject, 'id' | 'created_at' | 'updated_at'>> = addableRows.map((row) => ({
        code: row.code || null,
        name: row.name.trim(),
        credits: row.credits || 0,
        teacher: row.teacher || null,
        default_room: row.room || null,
        color: row.color,
        week_start: row.week_start === '' ? null : Number(row.week_start),
        week_end: row.week_end === '' ? null : Number(row.week_end),
        note: null,
        is_active: true,
      }))
      const subjects = await createSubjectsBulk(subjectPayloads)

      // 2) Tạo TOÀN BỘ lịch học trong 1 request (chỉ các môn có lịch)
      const schedulePayloads: Array<Omit<Schedule, 'id' | 'created_at' | 'updated_at'>> = []
      addableRows.forEach((row, idx) => {
        const hasPeriod = row.start_period !== '' && row.end_period !== ''
        const hasTime = row.start_time !== '' && row.end_time !== ''
        if (row.weekday !== '' && (hasPeriod || hasTime)) {
          schedulePayloads.push({
            subject_id: subjects[idx].id,
            weekday: Number(row.weekday),
            start_period: hasPeriod ? Number(row.start_period) : null,
            end_period: hasPeriod ? Number(row.end_period) : null,
            start_time: hasTime ? row.start_time : null,
            end_time: hasTime ? row.end_time : null,
            room: row.room || null,
            week_start: row.week_start === '' ? null : Number(row.week_start),
            week_end: row.week_end === '' ? null : Number(row.week_end),
            note: null,
          })
        }
      })
      if (schedulePayloads.length > 0) await createSchedulesBulk(schedulePayloads)

      const subjectCount = subjects.length
      setSuccessCount(subjectCount)
      setError(
        schedulePayloads.length < subjectCount
          ? `Đã thêm ${subjectCount} môn (${schedulePayloads.length} có lịch; ${subjectCount - schedulePayloads.length} môn chưa có lịch — bạn tự xếp trên trang Schedule).`
          : '',
      )
      await onDone()
    } catch (err) {
      setError(`Có lỗi khi lưu: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="schedule-modal-backdrop" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="schedule-modal quick-import">
        <div className="schedule-modal__header">
          <h2 className="schedule-modal__title">⚡ Dán nhanh môn học + lịch học</h2>
          <button type="button" className="schedule-modal__close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="schedule-modal__content">
          <div className="quick-import__hint">
            <b>💡 Cách dùng ChatGPT:</b> dán dữ liệu lịch học vào ChatGPT, yêu cầu nó xuất đúng định dạng bên dưới
            (theo chế độ <b>{isTimeMode ? 'theo giờ' : 'theo tiết'}</b> của bạn), rồi copy kết quả dán vào đây. Bấm{' '}
            <button type="button" className="quick-import__copy-btn" onClick={copyPrompt}>
              {copied ? '✅ Đã copy!' : '📋 Copy prompt ChatGPT luôn'}
            </button>
          </div>
          <div className="quick-import__format">
            {isTimeMode ? (
              <>
                <div>
                  Định dạng:{' '}
                  <code>Mã môn | Tên | Thứ | Phòng | Giờ</code>
                </div>
                <div className="quick-import__format-example">
                  VD: <code>CHE215 | Hóa Phân Tích | Thứ 2 | P.101 | 07:00-09:00</code>
                </div>
              </>
            ) : (
              <>
                <div>
                  Định dạng:{' '}
                  <code>Mã môn | Tên | Số TC | Giảng viên | Thứ X,tiết-đầu-tiết-cuối,phòng | tuần-đầu-tuần-cuối</code>
                </div>
                <div className="quick-import__format-example">
                  VD: <code>CHE215 | Hóa Phân Tích | 3 | Nguyễn Văn A | Thứ 2,1-2,P.101 | 1-16</code>
                </div>
              </>
            )}
            <div className="quick-import__format-example">
              💡 App cũng tự nhận diện dữ liệu dán thẳng từ portal (có thứ + giờ hoặc tiết).
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="quick-import__textarea"
            placeholder={
              isTimeMode
                ? 'Paste dữ liệu vào đây...\n\nCHE215 | Hóa Phân Tích | Thứ 2 | P.101 | 07:00-09:00\nENG216 | Reading - Level 3 | Thứ 4 | P.902 | 09:15-11:15'
                : 'Paste dữ liệu vào đây...\n\nCHE215 | Hóa Phân Tích | 3 | Nguyễn Văn A | Thứ 2,1-2,P.101 | 1-16\nENG216 | Reading - Level 3 | 3 | | Thứ 3,3-5,P.902 | 1-16'
            }
            rows={8}
          />

          <div className="quick-import__toolbar">
            <button type="button" className="pg-btn pg-btn--primary" onClick={handleAnalyze} disabled={saving}>
              🔍 Phân tích ({parsed.length} dòng)
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--success"
              onClick={handleSave}
              disabled={saving || addableRows.length === 0}
            >
              {saving ? 'Đang lưu...' : `➕ Thêm ${addableRows.length} môn (${scheduleReadyRows.length} có lịch)`}
            </button>
          </div>

          {error && <div className="schedule-alert">{error}</div>}
          {successCount > 0 && (
            <div className="quick-import__success">✅ Đã thêm {successCount} môn học + lịch học thành công!</div>
          )}

          {conflictIndices.size > 0 && (
            <div className="quick-import__conflict">
              <div className="quick-import__conflict-title">
                ⚠️ Phát hiện <b>{conflictIndices.size}</b> lịch bị <b>trùng thời gian</b> (với lịch học hiện có hoặc
                giữa các môn với nhau). Các dòng đỏ bên dưới — tick <b>Bỏ qua</b> nếu không muốn thêm.
              </div>
              <div className="quick-import__conflict-actions">
                <button type="button" className="pg-btn pg-btn--sm pg-btn--ghost" onClick={skipAllConflicts}>
                  Bỏ qua tất cả lịch trùng
                </button>
                <button type="button" className="pg-btn pg-btn--sm pg-btn--ghost" onClick={clearSkipped}>
                  Thêm tất cả
                </button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="quick-import__preview">
              <div className="quick-import__preview-title">Bảng xem trước — chỉnh sửa trực tiếp trước khi lưu</div>
              <table className="quick-import__table">
                <thead>
                  <tr>
                    <th>Tên môn</th>
                    <th>Mã</th>
                    <th>TC</th>
                    <th>GV</th>
                    <th>Thứ</th>
                    <th>{rows.some((r) => r.start_time || r.end_time) ? 'Giờ / Tiết' : 'Tiết'}</th>
                    <th>Phòng</th>
                    <th>Tuần</th>
                    <th>⚠️</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isTime = Boolean(row.start_time || row.end_time)
                    return (
                      <tr key={i} className={conflictIndices.has(i) ? 'quick-import__row--conflict' : ''}>
                        <td>
                          <input
                            value={row.name}
                            onChange={(e) => updateRow(i, { name: e.target.value })}
                            className="quick-import__cell"
                          />
                        </td>
                        <td>
                          <input
                            value={row.code}
                            onChange={(e) => updateRow(i, { code: e.target.value })}
                            className="quick-import__cell quick-import__cell--code"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.credits}
                            onChange={(e) => updateRow(i, { credits: Number(e.target.value) })}
                            className="quick-import__cell quick-import__cell--num"
                          />
                        </td>
                        <td>
                          <input
                            value={row.teacher}
                            onChange={(e) => updateRow(i, { teacher: e.target.value })}
                            className="quick-import__cell"
                          />
                        </td>
                        <td>
                          <select
                            value={String(row.weekday)}
                            onChange={(e) => updateRow(i, { weekday: Number(e.target.value) })}
                            className="quick-import__cell"
                          >
                            <option value="">--</option>
                            {[2, 3, 4, 5, 6, 7, 8].map((d) => (
                              <option key={d} value={d}>
                                Thứ {d}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="quick-import__periods">
                            {isTime ? (
                              <>
                                <input
                                  type="time"
                                  value={row.start_time}
                                  onChange={(e) => updateRow(i, { start_time: e.target.value })}
                                  className="quick-import__cell quick-import__cell--time"
                                  title="Giờ bắt đầu"
                                />
                                <span>–</span>
                                <input
                                  type="time"
                                  value={row.end_time}
                                  onChange={(e) => updateRow(i, { end_time: e.target.value })}
                                  className="quick-import__cell quick-import__cell--time"
                                  title="Giờ kết thúc"
                                />
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  value={row.start_period}
                                  onChange={(e) =>
                                    updateRow(i, { start_period: e.target.value === '' ? '' : Number(e.target.value) })
                                  }
                                  className="quick-import__cell quick-import__cell--num"
                                  title="Tiết bắt đầu"
                                />
                                <span>–</span>
                                <input
                                  type="number"
                                  value={row.end_period}
                                  onChange={(e) =>
                                    updateRow(i, { end_period: e.target.value === '' ? '' : Number(e.target.value) })
                                  }
                                  className="quick-import__cell quick-import__cell--num"
                                  title="Tiết kết thúc"
                                />
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            value={row.room}
                            onChange={(e) => updateRow(i, { room: e.target.value })}
                            className="quick-import__cell"
                          />
                        </td>
                        <td>
                          <div className="quick-import__periods">
                            <input
                              type="number"
                              value={row.week_start}
                              onChange={(e) =>
                                updateRow(i, { week_start: e.target.value === '' ? '' : Number(e.target.value) })
                              }
                              className="quick-import__cell quick-import__cell--num"
                              title="Tuần bắt đầu"
                            />
                            <span>–</span>
                            <input
                              type="number"
                              value={row.week_end}
                              onChange={(e) =>
                                updateRow(i, { week_end: e.target.value === '' ? '' : Number(e.target.value) })
                              }
                              className="quick-import__cell quick-import__cell--num"
                              title="Tuần kết thúc"
                            />
                          </div>
                        </td>
                        <td>
                          {conflictIndices.has(i) ? (
                            <label className="quick-import__skip">
                              <input type="checkbox" checked={skipped.has(i)} onChange={() => toggleSkip(i)} />
                              Bỏ qua
                            </label>
                          ) : null}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="quick-import__remove"
                            onClick={() => setRows((current) => current.filter((_, idx) => idx !== i))}
                            title="Xóa dòng"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="schedule-modal__footer">
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn--secondary btn--small" onClick={onClose} disabled={saving}>
            Đóng
          </button>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={handleSave}
            disabled={saving || addableRows.length === 0}
          >
            {saving ? 'Đang lưu...' : `✓ Thêm ${addableRows.length} môn`}
          </button>
        </div>
      </div>
    </div>
  )
}
