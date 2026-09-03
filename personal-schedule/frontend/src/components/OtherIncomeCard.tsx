import { useEffect, useMemo, useState } from 'react'
import type { OtherIncome } from '../types'
import type { OtherIncomePayload } from '../services/otherIncomeApi'

interface OtherIncomeCardProps {
  items: OtherIncome[] // Các khoản thuộc tháng đang xem (đã lọc + sắp theo ngày)
  monthKey: string
  monthShort: string
  monthLabel: string
  isLoading?: boolean
  onAdd: (payload: OtherIncomePayload) => Promise<void>
  onUpdate: (id: number, payload: Partial<OtherIncomePayload>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const formatVND = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} VNĐ`

function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function dayShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function dayLong(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()] ?? ''
  return `${wd}, ${dayShort(dateStr)}/${dateStr.slice(0, 4)}`
}

/**
 * Gõ tắt số tiền:
 * - 200k → 200000 (k = thêm 3 số 0)
 * - 1m   → 1000000 (m = thêm 6 số 0)
 * - 1.5k → 1500
 * Các ký tự khác không phải chữ số sẽ bị bỏ đi.
 */
function expandAmountText(raw: string): string {
  const t = raw.trim()
  const match = t.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([km])$/)
  if (match) {
    const multiplier = match[2] === 'k' ? 1000 : 1000000
    return String(Math.round(parseFloat(match[1]) * multiplier))
  }
  return t.replace(/[^\d]/g, '')
}

export function OtherIncomeCard({ items, monthKey, monthShort, monthLabel, isLoading, onAdd, onUpdate, onDelete }: OtherIncomeCardProps) {
  const today = useMemo(todayStr, [])

  const defaultForMonth = (mk: string) => (today.startsWith(mk) ? today : `${mk}-01`)

  // ----- Form thêm mới -----
  const [addDate, setAddDate] = useState(defaultForMonth(monthKey))
  const [addNote, setAddNote] = useState('')
  const [addAmount, setAddAmount] = useState('')

  // ----- Sửa inline -----
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editAmount, setEditAmount] = useState('')

  // Khi chuyển tháng → mặc định ngày mới theo tháng, thoát chế độ sửa
  useEffect(() => {
    setAddDate(defaultForMonth(monthKey))
    setEditingId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey])

  const addAmountNum = Math.round(Number(addAmount))
  const addValid = Number.isFinite(addAmountNum) && addAmountNum > 0

  const monthTotal = useMemo(() => items.reduce((sum, o) => sum + (o.amount || 0), 0), [items])

  const resetAdd = () => {
    setAddNote('')
    setAddAmount('')
    setAddDate(defaultForMonth(monthKey))
  }

  const handleAdd = async () => {
    if (!addValid) return
    await onAdd({ date: addDate, note: addNote.trim() || null, amount: addAmountNum })
    resetAdd()
  }

  const startEdit = (item: OtherIncome) => {
    setEditingId(item.id)
    setEditDate(item.date)
    setEditNote(item.note ?? '')
    setEditAmount(String(item.amount))
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: number) => {
    const amount = Math.round(Number(editAmount))
    if (!Number.isFinite(amount) || amount <= 0) return
    await onUpdate(id, { date: editDate, note: editNote.trim() || null, amount })
    setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    await onDelete(id)
    if (editingId === id) setEditingId(null)
  }

  return (
    <section className="pg-card">
      <div className="pg-card__head">
        <div>
          <h3 className="pg-card__title">Thu nhập khác · {monthShort}</h3>
          <p className="pg-card__subtitle">
            {monthLabel} · Thưởng/phụ cấp nhập tay — tính vào thu nhập tháng.
          </p>
        </div>
        {monthTotal > 0 && <div className="pg-oi__total">＋ {formatVND(monthTotal)}</div>}
      </div>

      {/* Form thêm mới */}
      <div className="pg-oi__form">
        <input
          type="date"
          className="pg-input pg-oi__date"
          value={addDate}
          onChange={(e) => setAddDate(e.target.value)}
          aria-label="Ngày"
        />
        <input
          type="text"
          className="pg-input pg-oi__note"
          placeholder="Ghi chú (vd: thưởng lễ, phụ cấp, tip...)"
          value={addNote}
          onChange={(e) => setAddNote(e.target.value)}
          maxLength={255}
          aria-label="Ghi chú"
        />
        <div className="pg-oi__amountwrap">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="pg-input pg-oi__amount"
            placeholder="Số tiền (vd: 200k)"
            title="Gõ 200k = 200.000đ · 1m = 1.000.000đ"
            value={addAmount}
            onChange={(e) => setAddAmount(expandAmountText(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && addValid) handleAdd()
            }}
            aria-label="Số tiền"
          />
          <span className="pg-oi__suffix">đ</span>
        </div>
        <button
          type="button"
          className="pg-btn pg-btn--primary"
          disabled={!addValid || isLoading}
          onClick={handleAdd}
        >
          ＋ Thêm
        </button>
      </div>

      {/* Danh sách trong tháng */}
      {items.length === 0 ? (
        <p className="pg-empty">Chưa có thu nhập khác trong {monthLabel}.</p>
      ) : (
        <ul className="pg-oi__list">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="pg-oi__row pg-oi__row--edit">
                <input
                  type="date"
                  className="pg-input pg-oi__date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  aria-label="Ngày"
                />
                <input
                  type="text"
                  className="pg-input pg-oi__note"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  maxLength={255}
                  aria-label="Ghi chú"
                />
                <div className="pg-oi__amountwrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="pg-input pg-oi__amount"
                    title="Gõ 200k = 200.000đ · 1m = 1.000.000đ"
                    value={editAmount}
                    onChange={(e) => setEditAmount(expandAmountText(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(item.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    aria-label="Số tiền"
                  />
                  <span className="pg-oi__suffix">đ</span>
                </div>
                <div className="pg-oi__editbtns">
                  <button type="button" className="pg-btn pg-btn--sm pg-btn--success" disabled={isLoading} onClick={() => saveEdit(item.id)}>
                    Lưu
                  </button>
                  <button type="button" className="pg-btn pg-btn--sm pg-btn--ghost" disabled={isLoading} onClick={cancelEdit}>
                    Huỷ
                  </button>
                </div>
              </li>
            ) : (
              <li key={item.id} className="pg-oi__row">
                <span className="pg-oi__badge">{dayShort(item.date)}</span>
                <div className="pg-oi__main">
                  <span className="pg-oi__note">{item.note?.trim() || 'Không ghi chú'}</span>
                  <span className="pg-oi__meta">{dayLong(item.date)}</span>
                </div>
                <span className="pg-oi__amount">＋ {formatVND(item.amount)}</span>
                <div className="pg-oi__actions">
                  <button type="button" onClick={() => startEdit(item)} title="Sửa">✏️</button>
                  <button type="button" onClick={() => handleDelete(item.id)} title="Xóa">🗑️</button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
