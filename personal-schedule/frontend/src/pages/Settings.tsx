import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchPeriods, createPeriod, updatePeriod, deletePeriod } from '../services/periodApi'
import type { ScheduleMode } from '../services/authApi'
import type { Period } from '../types'
import '../styles/pages.css'

interface PeriodForm {
  period_number: string
  start_time: string
  end_time: string
  label: string
}

const emptyForm: PeriodForm = { period_number: '', start_time: '07:00', end_time: '08:00', label: '' }

function toHHMM(value: string): string {
  return value.slice(0, 5)
}

export default function SettingsPage() {
  const { user, scheduleMode, updateScheduleMode } = useAuth()
  const [periods, setPeriods] = useState<Period[]>([])
  const [form, setForm] = useState<PeriodForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [savingMode, setSavingMode] = useState(false)

  const loadPeriods = async () => {
    try {
      setLoading(true)
      const data = await fetchPeriods()
      setPeriods(data)
    } catch {
      setError('Không thể tải danh sách tiết học.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (scheduleMode === 'PERIOD') {
      loadPeriods()
    } else {
      setLoading(false)
    }
  }, [scheduleMode])

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => a.period_number - b.period_number),
    [periods],
  )

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
  }

  const startEdit = (period: Period) => {
    setEditingId(period.id)
    setForm({
      period_number: String(period.period_number),
      start_time: toHHMM(period.start_time),
      end_time: toHHMM(period.end_time),
      label: period.label ?? '',
    })
    setError('')
  }

  const handleModeChange = async (mode: ScheduleMode) => {
    setSavingMode(true)
    setError('')
    setSuccess('')
    try {
      await updateScheduleMode(mode)
      setSuccess(`Đã chuyển sang chế độ ${mode === 'PERIOD' ? 'theo tiết' : 'theo giờ'}.`)
    } catch {
      setError('Không đổi được chế độ.')
    } finally {
      setSavingMode(false)
    }
  }

  const submit = async () => {
    const period_number = Number(form.period_number)
    if (!period_number || period_number < 1) {
      setError('Số tiết phải là số nguyên >= 1.')
      return
    }
    if (!form.start_time || !form.end_time || form.end_time <= form.start_time) {
      setError('Giờ kết thúc phải sau giờ bắt đầu.')
      return
    }
    const payload = {
      period_number,
      start_time: form.start_time,
      end_time: form.end_time,
      label: form.label.trim() || `Tiết ${period_number}`,
      note: null,
    }
    try {
      setError('')
      setSuccess('')
      if (editingId) {
        const updated = await updatePeriod(editingId, payload)
        setPeriods((cur) => cur.map((p) => (p.id === editingId ? updated : p)))
        setSuccess('Đã cập nhật tiết học.')
      } else {
        const created = await createPeriod(payload)
        setPeriods((cur) => [...cur, created])
        setSuccess('Đã thêm tiết học.')
      }
      resetForm()
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Không lưu được tiết học.',
      )
    }
  }

  const remove = async (id: number) => {
    try {
      setError('')
      await deletePeriod(id)
      setPeriods((cur) => cur.filter((p) => p.id !== id))
      if (editingId === id) resetForm()
      setSuccess('Đã xóa tiết học.')
    } catch {
      setError('Không xóa được tiết học. Có thể tiết đang được lịch học sử dụng.')
    }
  }

  return (
    <div className="pg-page">
      <header className="pg-header">
        <div className="pg-header__left">
          <div className="pg-header__icon">⚙️</div>
          <div>
            <h2 className="pg-header__title">Cài đặt</h2>
            <p className="pg-header__subtitle">Cấu hình chế độ thời khóa biểu và khung tiết học của bạn.</p>
          </div>
        </div>
      </header>

      {error && <div className="schedule-alert">{error}</div>}
      {success && <div className="quick-import__success">{success}</div>}

      <section className="pg-card">
        <div className="pg-card__head">
          <div>
            <h3 className="pg-card__title">🕐 Chế độ thời khóa biểu</h3>
            <p className="pg-card__subtitle">
              {user ? `Tài khoản: ${user.email}` : '...'} — chọn cách bạn nhập lịch học.
            </p>
          </div>
        </div>

        <div className="pg-grid pg-grid--form" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            className={`schedule-mode-card ${scheduleMode === 'PERIOD' ? 'schedule-mode-card--active' : ''}`}
            onClick={() => handleModeChange('PERIOD')}
            disabled={savingMode}
          >
            <span className="schedule-mode-card__title">🕐 Theo tiết</span>
            <span className="schedule-mode-card__desc">
              Nhập lịch bằng số tiết (vd: Thứ 2, tiết 1-3). Khai báo khung giờ từng tiết bên dưới.
            </span>
          </button>
          <button
            type="button"
            className={`schedule-mode-card ${scheduleMode === 'TIME' ? 'schedule-mode-card--active' : ''}`}
            onClick={() => handleModeChange('TIME')}
            disabled={savingMode}
          >
            <span className="schedule-mode-card__title">⏱️ Theo giờ</span>
            <span className="schedule-mode-card__desc">
              Nhập lịch bằng giờ trực tiếp (vd: Thứ 2, 07:00-09:00). Không cần khai báo tiết.
            </span>
          </button>
        </div>
      </section>

      {scheduleMode === 'PERIOD' && (
        <section className="pg-card">
          <div className="pg-card__head">
            <div>
              <h3 className="pg-card__title">📚 Khung tiết học</h3>
              <p className="pg-card__subtitle">
                Khai báo số tiết + khung giờ của trường bạn. Tính năng "Dán nhanh" sẽ dùng khung này.
              </p>
            </div>
          </div>

          <div className="pg-grid pg-grid--form" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
            <div>
              <div className="pg-grid pg-grid--form" style={{ gridTemplateColumns: '1fr' }}>
                <label className="pg-field">
                  <span className="pg-field__label">Số tiết</span>
                  <input
                    type="number"
                    min={1}
                    value={form.period_number}
                    onChange={(e) => setForm({ ...form, period_number: e.target.value })}
                    className="pg-input"
                    placeholder="VD: 11"
                  />
                </label>
                <label className="pg-field">
                  <span className="pg-field__label">Giờ bắt đầu</span>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="pg-input"
                  />
                </label>
                <label className="pg-field">
                  <span className="pg-field__label">Giờ kết thúc</span>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="pg-input"
                  />
                </label>
                <label className="pg-field">
                  <span className="pg-field__label">Tên hiển thị (tùy chọn)</span>
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="pg-input"
                    placeholder="VD: Tiết 11"
                  />
                </label>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
                <button type="button" onClick={submit} className="pg-btn pg-btn--primary">
                  {editingId ? 'Cập nhật tiết' : '➕ Thêm tiết'}
                </button>
                <button type="button" onClick={resetForm} className="pg-btn pg-btn--ghost">
                  Reset
                </button>
              </div>
            </div>

            <div>
              {loading ? (
                <p className="pg-empty">Đang tải...</p>
              ) : sortedPeriods.length === 0 ? (
                <p className="pg-empty">Chưa có tiết học nào. Hãy thêm tiết đầu tiên.</p>
              ) : (
                <div className="pg-list">
                  {sortedPeriods.map((period) => (
                    <div key={period.id} className="pg-list-item">
                      <div style={{ minWidth: 0 }}>
                        <p className="pg-list-item__name">{period.label || `Tiết ${period.period_number}`}</p>
                        <p className="pg-list-item__meta">
                          Tiết {period.period_number} · {toHHMM(period.start_time)} – {toHHMM(period.end_time)}
                        </p>
                      </div>
                      <div className="pg-list-item__actions">
                        <button type="button" onClick={() => startEdit(period)} className="pg-btn pg-btn--ghost pg-btn--sm">
                          Sửa
                        </button>
                        <button type="button" onClick={() => remove(period.id)} className="pg-btn pg-btn--danger pg-btn--sm">
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

