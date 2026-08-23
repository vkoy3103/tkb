import { useEffect, useMemo, useState } from 'react'
import { fetchSubjects, createSubject, deleteSubject, updateSubject } from '../services/subjectApi'
import { fetchPeriods } from '../services/periodApi'
import { fetchSchedules } from '../services/scheduleApi'
import {
  createScheduleOverride,
  deleteScheduleOverride,
  fetchScheduleOverrides,
  updateScheduleOverride,
} from '../services/scheduleOverrideApi'
import type { Period, Schedule, ScheduleOverride, Subject } from '../types'
import { QuickImportScheduler } from '../components/QuickImportScheduler'
import '../styles/pages.css'

const defaultSubject = {
  name: '',
  code: '',
  credits: 0,
  teacher: '',
  default_room: '',
  color: '#22c55e',
  week_start: '',
  week_end: '',
  note: '',
  is_active: true,
}

function formatLabel(subject: Subject) {
  return `${subject.name}${subject.code ? ` · ${subject.code}` : ''}`
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState(defaultSubject)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [holidayForm, setHolidayForm] = useState({
    class_schedule_id: '',
    date: '',
    reason: '',
    note: '',
  })
  const [makeupForm, setMakeupForm] = useState({
    class_schedule_id: '',
    date: '',
    new_date: '',
    new_start_period: '',
    new_end_period: '',
    new_room: '',
    reason: '',
    note: '',
  })
  const [holidayEditingId, setHolidayEditingId] = useState<number | null>(null)
  const [makeupEditingId, setMakeupEditingId] = useState<number | null>(null)
  const [overrideError, setOverrideError] = useState('')
  const [overrideLoading, setOverrideLoading] = useState(true)
  const [isQuickImportOpen, setIsQuickImportOpen] = useState(false)

  const loadData = async () => {
    try {
      setOverrideLoading(true)
      const [subjectData, scheduleData, periodData, overrideData] = await Promise.all([
        fetchSubjects(),
        fetchSchedules(),
        fetchPeriods(),
        fetchScheduleOverrides(),
      ])
      setSubjects(subjectData)
      setSchedules(scheduleData)
      setPeriods(periodData)
      setScheduleOverrides(overrideData)
    } catch {
      setOverrideError('Không thể tải dữ liệu lịch nghỉ / học bù.')
    } finally {
      setOverrideLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredSubjects = useMemo(
    () => subjects.filter((subject) => subject.name.toLowerCase().includes(search.toLowerCase())),
    [subjects, search],
  )

  const resetForm = () => {
    setForm(defaultSubject)
    setEditingId(null)
  }

  const submit = async () => {
    const payload = {
      ...form,
      credits: Number(form.credits),
      week_start: form.week_start ? Number(form.week_start) : null,
      week_end: form.week_end ? Number(form.week_end) : null,
      is_active: Boolean(form.is_active),
    }
    if (editingId) {
      const updated = await updateSubject(editingId, payload)
      setSubjects((current) => current.map((subject) => (subject.id === editingId ? updated : subject)))
    } else {
      const created = await createSubject(payload)
      setSubjects((current) => [created, ...current])
    }
    resetForm()
  }

  const startEdit = (subject: Subject) => {
    setForm({
      name: subject.name,
      code: subject.code || '',
      credits: subject.credits,
      teacher: subject.teacher || '',
      default_room: subject.default_room || '',
      color: subject.color || '#22c55e',
      week_start: subject.week_start != null ? String(subject.week_start) : '',
      week_end: subject.week_end != null ? String(subject.week_end) : '',
      note: subject.note || '',
      is_active: subject.is_active,
    })
    setEditingId(subject.id)
  }

  const remove = async (subjectId: number) => {
    await deleteSubject(subjectId)
    setSubjects((current) => current.filter((subject) => subject.id !== subjectId))
  }

  const periodOptions = useMemo(() => [...periods].sort((a, b) => a.period_number - b.period_number), [periods])

  const resetHolidayForm = () => {
    setHolidayForm({ class_schedule_id: '', date: '', reason: '', note: '' })
    setHolidayEditingId(null)
  }

  const resetMakeupForm = () => {
    setMakeupForm({
      class_schedule_id: '',
      date: '',
      new_date: '',
      new_start_period: '',
      new_end_period: '',
      new_room: '',
      reason: '',
      note: '',
    })
    setMakeupEditingId(null)
  }

  const submitHoliday = async () => {
    if (!holidayForm.class_schedule_id || !holidayForm.date) {
      setOverrideError('Vui lòng chọn lịch học và ngày nghỉ.')
      return
    }

    const payload = {
      class_schedule_id: Number(holidayForm.class_schedule_id),
      date: holidayForm.date,
      type: 'cancel',
      new_date: null,
      new_start_period: null,
      new_end_period: null,
      new_room: null,
      reason: holidayForm.reason || null,
      note: holidayForm.note || null,
    }

    try {
      if (holidayEditingId !== null) {
        const updated = await updateScheduleOverride(holidayEditingId, payload)
        setScheduleOverrides((current) => current.map((item) => (item.id === holidayEditingId ? updated : item)))
      } else {
        const created = await createScheduleOverride(payload)
        setScheduleOverrides((current) => [created, ...current])
      }
      resetHolidayForm()
      setOverrideError('')
    } catch {
      setOverrideError('Không thể lưu lịch nghỉ học. Vui lòng kiểm tra dữ liệu.')
    }
  }

  const submitMakeup = async () => {
    if (!makeupForm.class_schedule_id || !makeupForm.date) {
      setOverrideError('Vui lòng chọn lịch học và ngày học bù.')
      return
    }

    const payload = {
      class_schedule_id: Number(makeupForm.class_schedule_id),
      date: makeupForm.date,
      type: 'make_up',
      new_date: makeupForm.new_date || null,
      new_start_period: makeupForm.new_start_period ? Number(makeupForm.new_start_period) : null,
      new_end_period: makeupForm.new_end_period ? Number(makeupForm.new_end_period) : null,
      new_room: makeupForm.new_room || null,
      reason: makeupForm.reason || null,
      note: makeupForm.note || null,
    }

    try {
      if (makeupEditingId !== null) {
        const updated = await updateScheduleOverride(makeupEditingId, payload)
        setScheduleOverrides((current) => current.map((item) => (item.id === makeupEditingId ? updated : item)))
      } else {
        const created = await createScheduleOverride(payload)
        setScheduleOverrides((current) => [created, ...current])
      }
      resetMakeupForm()
      setOverrideError('')
    } catch {
      setOverrideError('Không thể lưu lịch học bù. Vui lòng kiểm tra dữ liệu.')
    }
  }

  const startEditHoliday = (override: ScheduleOverride) => {
    setHolidayEditingId(override.id)
    setHolidayForm({
      class_schedule_id: String(override.class_schedule_id),
      date: override.date,
      reason: override.reason || '',
      note: override.note || '',
    })
  }

  const startEditMakeup = (override: ScheduleOverride) => {
    setMakeupEditingId(override.id)
    setMakeupForm({
      class_schedule_id: String(override.class_schedule_id),
      date: override.date,
      new_date: override.new_date || '',
      new_start_period: override.new_start_period ? String(override.new_start_period) : '',
      new_end_period: override.new_end_period ? String(override.new_end_period) : '',
      new_room: override.new_room || '',
      reason: override.reason || '',
      note: override.note || '',
    })
  }

  const removeOverride = async (overrideId: number) => {
    try {
      await deleteScheduleOverride(overrideId)
      setScheduleOverrides((current) => current.filter((item) => item.id !== overrideId))
      if (holidayEditingId === overrideId) {
        resetHolidayForm()
      }
      if (makeupEditingId === overrideId) {
        resetMakeupForm()
      }
    } catch {
      setOverrideError('Không thể xoá lịch nghỉ học bù.')
    }
  }

  return (
    <div className="pg-page">
      <header className="pg-header">
        <div className="pg-header__left">
          <div className="pg-header__icon">📚</div>
          <div>
            <h2 className="pg-header__title">Subjects</h2>
            <p className="pg-header__subtitle">Quản lý môn học của bạn.</p>
          </div>
        </div>
        <div className="pg-header__actions">
          <button type="button" className="pg-btn pg-btn--primary" onClick={() => setIsQuickImportOpen(true)}>
            ⚡ Dán nhanh từ bảng
          </button>
        </div>
      </header>

      <div className="pg-grid pg-grid--form" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <section className="pg-card">
          <div className="pg-card__head">
            <div>
              <h3 className="pg-card__title">{editingId ? '✏️ Sửa môn học' : '➕ Thêm môn học'}</h3>
              <p className="pg-card__subtitle">Thông tin môn học và phạm vi tuần học.</p>
            </div>
          </div>

          <div className="pg-grid pg-grid--form">
            <label className="pg-field">
              <span className="pg-field__label">Tên môn</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pg-input" />
            </label>
            <label className="pg-field">
              <span className="pg-field__label">Mã môn</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="pg-input" />
            </label>
            <label className="pg-field">
              <span className="pg-field__label">Số tín chỉ</span>
              <input
                type="number"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                className="pg-input"
              />
            </label>
            <label className="pg-field">
              <span className="pg-field__label">Giảng viên</span>
              <input value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} className="pg-input" />
            </label>
            <label className="pg-field">
              <span className="pg-field__label">Phòng mặc định</span>
              <input value={form.default_room} onChange={(e) => setForm({ ...form, default_room: e.target.value })} className="pg-input" />
            </label>
            <label className="pg-field">
              <span className="pg-field__label">Màu sắc</span>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="pg-input" />
            </label>
            <label className="pg-field">
              <span className="pg-field__label">Tuần bắt đầu</span>
              <input
                type="number"
                min={1}
                value={form.week_start}
                onChange={(e) => setForm({ ...form, week_start: e.target.value })}
                className="pg-input"
              />
            </label>
            <label className="pg-field">
              <span className="pg-field__label">Tuần kết thúc</span>
              <input
                type="number"
                min={1}
                value={form.week_end}
                onChange={(e) => setForm({ ...form, week_end: e.target.value })}
                className="pg-input"
              />
            </label>
            <label className="pg-field pg-field--full">
              <span className="pg-field__label">Ghi chú</span>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="pg-textarea" />
            </label>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button type="button" onClick={submit} className="pg-btn pg-btn--primary">
              {editingId ? 'Cập nhật môn học' : 'Thêm môn học'}
            </button>
            <button type="button" onClick={resetForm} className="pg-btn pg-btn--ghost">
              Reset
            </button>
          </div>
        </section>

        <section className="pg-card">
          <div className="pg-card__head">
            <div>
              <h3 className="pg-card__title">Danh sách môn học</h3>
              <p className="pg-card__subtitle">Tìm kiếm và quản lý các môn học.</p>
            </div>
            <div className="pg-search">
              <span className="pg-search__icon">🔍</span>
              <input
                placeholder="Tìm môn học..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pg-input"
              />
            </div>
          </div>

          <div className="pg-list">
            {filteredSubjects.length === 0 ? (
              <p className="pg-empty">Không có môn học nào.</p>
            ) : (
              filteredSubjects.map((subject) => (
                <div key={subject.id} className="pg-list-item">
                  <div style={{ minWidth: 0 }}>
                    <p className="pg-list-item__name">{formatLabel(subject)}</p>
                    <p className="pg-list-item__meta">
                      {subject.teacher || 'No teacher'} · {subject.default_room || 'No room'}
                      {subject.week_start != null || subject.week_end != null
                        ? ` · Tuần ${subject.week_start ?? 1}-${subject.week_end ?? '…'}`
                        : ''}
                    </p>
                  </div>
                  <div className="pg-list-item__actions">
                    <button type="button" onClick={() => startEdit(subject)} className="pg-btn pg-btn--ghost pg-btn--sm">
                      Sửa
                    </button>
                    <button type="button" onClick={() => remove(subject.id)} className="pg-btn pg-btn--danger pg-btn--sm">
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="schedule-card schedule-override-card">
        <div className="schedule-card__header">
          <div>
            <h3 className="schedule-card__title">Quản lý lịch nghỉ và học bù</h3>
            <p className="schedule-card__subtitle">Tách riêng lịch nghỉ học và lịch học bù để thầy cô dễ theo dõi.</p>
          </div>
        </div>

        {overrideError && <div className="schedule-alert">{overrideError}</div>}
        {overrideLoading ? (
          <div className="schedule-empty-state">Đang tải dữ liệu lịch nghỉ / học bù...</div>
        ) : (
          <div className="schedule-override-grid">
            <div className="schedule-override-panel">
              <h4 className="schedule-card__title schedule-card__title--small">Nghỉ học</h4>

              <div className="schedule-form-grid schedule-form-grid--override">
                <label className="schedule-field schedule-field--full">
                  <span>Lịch học</span>
                  <select
                    value={holidayForm.class_schedule_id}
                    onChange={(e) => setHolidayForm({ ...holidayForm, class_schedule_id: e.target.value })}
                    className="schedule-input"
                  >
                    <option value="">-- Chọn lịch --</option>
                    {schedules.map((schedule) => {
                      const subject = subjects.find((item) => item.id === schedule.subject_id)
                      return (
                        <option key={schedule.id} value={schedule.id}>
                          {subject?.name ?? 'Môn học'} · Tiết {schedule.start_period}-{schedule.end_period}
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label className="schedule-field schedule-field--full">
                  <span>Ngày nghỉ</span>
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="schedule-input"
                  />
                </label>

                <label className="schedule-field schedule-field--full">
                  <span>Lý do</span>
                  <input
                    value={holidayForm.reason}
                    onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })}
                    placeholder="VD: Nghỉ lễ, có việc"
                    className="schedule-input"
                  />
                </label>

                <label className="schedule-field schedule-field--full">
                  <span>Ghi chú</span>
                  <textarea
                    value={holidayForm.note}
                    onChange={(e) => setHolidayForm({ ...holidayForm, note: e.target.value })}
                    rows={3}
                    className="schedule-input schedule-textarea"
                  />
                </label>
              </div>

              <div className="schedule-actions">
                <button type="button" onClick={submitHoliday} className="schedule-primary-button">
                  {holidayEditingId ? 'Cập nhật' : 'Lưu nghỉ học'}
                </button>
                <button type="button" onClick={resetHolidayForm} className="schedule-secondary-button">
                  Reset
                </button>
              </div>

              <div className="schedule-list schedule-list--override">
                {scheduleOverrides.filter((item) => item.type === 'cancel').length === 0 ? (
                  <div className="schedule-empty-state">Chưa có lịch nghỉ học.</div>
                ) : (
                  scheduleOverrides
                    .filter((item) => item.type === 'cancel')
                    .map((override) => {
                      const schedule = schedules.find((item) => item.id === override.class_schedule_id)
                      const subject = schedule ? subjects.find((item) => item.id === schedule.subject_id) : undefined
                      return (
                        <div key={override.id} className="schedule-item schedule-item--override">
                          <div className="schedule-item__content">
                            <p className="schedule-item__name">{subject?.name ?? 'Môn học'} · Nghỉ học</p>
                            <p className="schedule-item__meta">{override.date}</p>
                            {override.reason && <p className="schedule-item__note">{override.reason}</p>}
                          </div>

                          <div className="schedule-item__actions">
                            <button type="button" onClick={() => startEditHoliday(override)} className="schedule-action-button schedule-action-button--edit">
                              Sửa
                            </button>
                            <button type="button" onClick={() => removeOverride(override.id)} className="schedule-action-button schedule-action-button--delete">
                              Xoá
                            </button>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>

            <div className="schedule-override-panel">
              <h4 className="schedule-card__title schedule-card__title--small">Học bù</h4>

              <div className="schedule-form-grid schedule-form-grid--override">
                <label className="schedule-field schedule-field--full">
                  <span>Lịch học</span>
                  <select
                    value={makeupForm.class_schedule_id}
                    onChange={(e) => setMakeupForm({ ...makeupForm, class_schedule_id: e.target.value })}
                    className="schedule-input"
                  >
                    <option value="">-- Chọn lịch --</option>
                    {schedules.map((schedule) => {
                      const subject = subjects.find((item) => item.id === schedule.subject_id)
                      return (
                        <option key={schedule.id} value={schedule.id}>
                          {subject?.name ?? 'Môn học'} · Tiết {schedule.start_period}-{schedule.end_period}
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label className="schedule-field schedule-field--full">
                  <span>Ngày học bù</span>
                  <input
                    type="date"
                    value={makeupForm.date}
                    onChange={(e) => setMakeupForm({ ...makeupForm, date: e.target.value })}
                    className="schedule-input"
                  />
                </label>

                <label className="schedule-field">
                  <span>Ngày mới</span>
                  <input
                    type="date"
                    value={makeupForm.new_date}
                    onChange={(e) => setMakeupForm({ ...makeupForm, new_date: e.target.value })}
                    className="schedule-input"
                  />
                </label>

                <label className="schedule-field">
                  <span>Phòng</span>
                  <input
                    value={makeupForm.new_room}
                    onChange={(e) => setMakeupForm({ ...makeupForm, new_room: e.target.value })}
                    placeholder="VD: B301"
                    className="schedule-input"
                  />
                </label>

                <label className="schedule-field">
                  <span>Tiết bắt đầu</span>
                  <select
                    value={makeupForm.new_start_period}
                    onChange={(e) => setMakeupForm({ ...makeupForm, new_start_period: e.target.value })}
                    className="schedule-input"
                  >
                    <option value="">-- Chọn --</option>
                    {periodOptions.map((period) => (
                      <option key={period.id} value={period.period_number}>Tiết {period.period_number}</option>
                    ))}
                  </select>
                </label>

                <label className="schedule-field">
                  <span>Tiết kết thúc</span>
                  <select
                    value={makeupForm.new_end_period}
                    onChange={(e) => setMakeupForm({ ...makeupForm, new_end_period: e.target.value })}
                    className="schedule-input"
                  >
                    <option value="">-- Chọn --</option>
                    {periodOptions.map((period) => (
                      <option key={period.id} value={period.period_number}>Tiết {period.period_number}</option>
                    ))}
                  </select>
                </label>

                <label className="schedule-field schedule-field--full">
                  <span>Lý do</span>
                  <input
                    value={makeupForm.reason}
                    onChange={(e) => setMakeupForm({ ...makeupForm, reason: e.target.value })}
                    placeholder="VD: Học bù theo kế hoạch"
                    className="schedule-input"
                  />
                </label>

                <label className="schedule-field schedule-field--full">
                  <span>Ghi chú</span>
                  <textarea
                    value={makeupForm.note}
                    onChange={(e) => setMakeupForm({ ...makeupForm, note: e.target.value })}
                    rows={3}
                    className="schedule-input schedule-textarea"
                  />
                </label>
              </div>

              <div className="schedule-actions">
                <button type="button" onClick={submitMakeup} className="schedule-primary-button">
                  {makeupEditingId ? 'Cập nhật' : 'Lưu học bù'}
                </button>
                <button type="button" onClick={resetMakeupForm} className="schedule-secondary-button">
                  Reset
                </button>
              </div>

              <div className="schedule-list schedule-list--override">
                {scheduleOverrides.filter((item) => item.type === 'make_up').length === 0 ? (
                  <div className="schedule-empty-state">Chưa có lịch học bù.</div>
                ) : (
                  scheduleOverrides
                    .filter((item) => item.type === 'make_up')
                    .map((override) => {
                      const schedule = schedules.find((item) => item.id === override.class_schedule_id)
                      const subject = schedule ? subjects.find((item) => item.id === schedule.subject_id) : undefined
                      return (
                        <div key={override.id} className="schedule-item schedule-item--override">
                          <div className="schedule-item__content">
                            <p className="schedule-item__name">{subject?.name ?? 'Môn học'} · Học bù</p>
                            <p className="schedule-item__meta">
                              {override.date}
                              {override.new_date ? ` → ${override.new_date}` : ''}
                              {override.new_start_period && override.new_end_period ? ` · Tiết ${override.new_start_period}-${override.new_end_period}` : ''}
                              {override.new_room ? ` · ${override.new_room}` : ''}
                            </p>
                            {override.reason && <p className="schedule-item__note">{override.reason}</p>}
                          </div>

                          <div className="schedule-item__actions">
                            <button type="button" onClick={() => startEditMakeup(override)} className="schedule-action-button schedule-action-button--edit">
                              Sửa
                            </button>
                            <button type="button" onClick={() => removeOverride(override.id)} className="schedule-action-button schedule-action-button--delete">
                              Xoá
                            </button>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <QuickImportScheduler
        isOpen={isQuickImportOpen}
        onClose={() => setIsQuickImportOpen(false)}
        onDone={loadData}
      />
    </div>
  )
}
