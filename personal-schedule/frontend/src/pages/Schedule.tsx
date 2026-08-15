import { useEffect, useMemo, useState } from 'react'
import { Timetable } from '../components/timetable/Timetable'
import { MakeupScheduler } from '../components/MakeupScheduler'
import { InlineScheduleEditor } from '../components/InlineScheduleEditor'
import { fetchPeriods } from '../services/periodApi'
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  updateSchedule,
} from '../services/scheduleApi'
import {
  createScheduleOverride,
  deleteScheduleOverride,
  fetchScheduleOverrides,
  updateScheduleOverride,
} from '../services/scheduleOverrideApi'
import { fetchSubjects } from '../services/subjectApi'
import type { Period, Schedule, ScheduleOverride, Subject } from '../types'
import '../styles/cancel-modal.css'

const weekdayOptions = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'Chủ nhật' },
]

const emptyForm = {
  subject_id: '',
  weekday: 1,
  start_period: 1,
  end_period: 2,
  room: '',
  week_start: 1,
  week_end: 16,
  note: '',
}

const defaultCancelOverride = {
  type: 'cancel' as const,
}

export default function SchedulePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([])
  const [form, setForm] = useState(emptyForm)
  const [holidayForm, setHolidayForm] = useState({
    class_schedule_id: '',
    date: '',
    reason: '',
    note: '',
  })
  const [cancelTarget, setCancelTarget] = useState<{
    schedule: Schedule
    date: string
  } | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; schedule: Schedule; date: string } | null>(
    null,
  )
  const [makeupTarget, setMakeupTarget] = useState<{
    schedule: Schedule
    date: string
    overrideToEdit?: ScheduleOverride
  } | null>(null)

  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const [holidayEditingId, setHolidayEditingId] = useState<number | null>(null)
  const [makeupEditingId, setMakeupEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const periodOptions = useMemo(() => [...periods].sort((a, b) => a.period_number - b.period_number), [periods])

  const handleOpenCancelModal = (schedule: Schedule, date: string) => {
    setCancelTarget({ schedule, date })
    setContextMenu(null)
  }

  const confirmCancel = async () => {
    // This function is now triggered from the cancel modal
    if (!cancelTarget) return

    try {
      setCancelLoading(true)

      await createScheduleOverride({
        class_schedule_id: Number(cancelTarget.schedule.id),
        date: cancelTarget.date,
        type: 'cancel',
        reason: cancelReason.trim() || null,
        note: cancelNote.trim() || null,
      })

      // Tải lại toàn bộ dữ liệu
      await loadData()

      // Đóng modal
      setCancelTarget(null)
      setCancelReason('')
      setCancelNote('')
    } catch (error) {
      console.error('Failed to cancel schedule:', error)
      alert('Không thể đánh dấu nghỉ học')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleOpenMakeupScheduler = (schedule: Schedule, date: string) => {
    setMakeupTarget({ schedule, date })
    setContextMenu(null)
  }

  const handleSaveMakeup = async (data: Partial<ScheduleOverride>) => {
    if (!makeupTarget) return

    // Nếu có overrideToEdit, nghĩa là đang cập nhật
    if (makeupTarget.overrideToEdit) {
      const payload = { ...makeupTarget.overrideToEdit, ...data }
      await updateScheduleOverride(makeupTarget.overrideToEdit.id, payload)
    } else {
      // Nếu không, là tạo mới
      const payload = {
        ...data,
        class_schedule_id: Number(makeupTarget.schedule.id),
        date: makeupTarget.date, // Ngày gốc của buổi học được bù
        type: 'make_up' as const,
      }
      await createScheduleOverride(payload)
    }

    await loadData() // Tải lại dữ liệu để hiển thị lịch học bù
  }

  const handleDeleteOverride = async (overrideId: number) => {
    await deleteScheduleOverride(overrideId)
    await loadData()
  }

  const handleSaveSchedule = async (data: Partial<Schedule>) => {
    const payload = {
      ...data,
      subject_id: Number(data.subject_id),
      weekday: Number(data.weekday),
      start_period: Number(data.start_period),
      end_period: Number(data.end_period),
    }

    if (editingSchedule) {
      const updated = await updateSchedule(editingSchedule.id, payload)
      setSchedules((current) => current.map((item) => (item.id === editingSchedule.id ? updated : item)))
    } else {
      const created = await createSchedule(payload)
      setSchedules((current) => [created, ...current])
    }
  }

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setIsEditModalOpen(true)
    setContextMenu(null)
  }

  const handleScheduleInteraction = async (e: React.MouseEvent, schedule: Schedule, date: string) => {
    e.preventDefault()

    // 1. Xử lý cho lịch học bù
    if ('_isMakeup' in schedule && schedule._isMakeup) {
      const overrideId = Number(String(schedule.id).replace('makeup-', ''))
      if (isNaN(overrideId)) return

      const overrideToEdit = scheduleOverrides.find((o) => o.id === overrideId)
      if (!overrideToEdit) return

      const originalSchedule = schedules.find((s) => s.id === overrideToEdit.class_schedule_id)
      if (!originalSchedule) return

      // Mở modal học bù ở chế độ chỉnh sửa
      setMakeupTarget({
        schedule: originalSchedule,
        date: overrideToEdit.date, // Ngày gốc của buổi học được bù
        overrideToEdit: overrideToEdit,
      })
      return // Dừng lại ở đây, không mở context menu
    }

    // 2. Xử lý cho lịch học cố định đã được đánh dấu nghỉ
    const cancelOverride = scheduleOverrides.find(
      (o) => o.type === 'cancel' && Number(o.class_schedule_id) === Number(schedule.id) && o.date === date,
    )

    if (cancelOverride) {
      if (confirm('Buổi học này đã được đánh dấu nghỉ. Bạn có muốn đi học lại không?')) {
        try {
          await handleDeleteOverride(cancelOverride.id)
        } catch (error) {
          alert('Không thể hoàn tác trạng thái nghỉ.')
        }
      }
      return
    }

    // 3. Xử lý cho lịch học cố định, chưa nghỉ -> Mở context menu
    setContextMenu({ x: e.clientX, y: e.clientY, schedule, date })
  }

  const handleAddNewSchedule = () => {
    setEditingSchedule(null) // Đảm bảo không có schedule nào đang được chỉnh sửa
    setIsEditModalOpen(true)
  }
  const loadData = async () => {
    try {
      setLoading(true)
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
      setError('Không thể tải dữ liệu lịch học.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const resetHolidayForm = () => {
    setHolidayForm({
      class_schedule_id: '',
      date: '',
      reason: '',
      note: '',
    })
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

  const startEdit = (schedule: Schedule) => {
    setEditingId(schedule.id)
    setForm({
      subject_id: String(schedule.subject_id),
      weekday: schedule.weekday,
      start_period: schedule.start_period,
      end_period: schedule.end_period,
      room: schedule.room || '',
      week_start: schedule.week_start ?? 1,
      week_end: schedule.week_end ?? 16,
      note: schedule.note || '',
    })
  }

  const submit = async () => {
    const payload = {
      subject_id: Number(form.subject_id),
      weekday: Number(form.weekday),
      start_period: Number(form.start_period),
      end_period: Number(form.end_period),
      room: form.room || null,
      week_start: Number(form.week_start),
      week_end: Number(form.week_end),
      note: form.note || null,
    }

    if (!payload.subject_id || payload.start_period > payload.end_period) {
      setError('Vui lòng chọn môn học hợp lệ và tiết bắt đầu phải nhỏ hơn hoặc bằng tiết kết thúc.')
      return
    }

    try {
      if (editingId !== null) {
        const updated = await updateSchedule(editingId, payload)
        setSchedules((current) => current.map((item) => (item.id === editingId ? updated : item)))
      } else {
        const created = await createSchedule(payload)
        setSchedules((current) => [created, ...current])
      }
      resetForm()
      setError('')
    } catch {
      setError('Không thể lưu lịch học. Kiểm tra lại thông tin đã nhập.')
    }
  }

  const remove = async (scheduleId: number) => {
    try {
      await deleteSchedule(scheduleId)
      setSchedules((current) => current.filter((item) => item.id !== scheduleId))
      setScheduleOverrides((current) => current.filter((item) => item.class_schedule_id !== scheduleId))
      if (editingId === scheduleId) {
        resetForm()
      }
    } catch {
      setError('Không thể xoá lịch học này.')
    }
  }

  const submitHoliday = async () => {
    if (!holidayForm.class_schedule_id || !holidayForm.date) {
      setError('Vui lòng chọn lịch học và ngày nghỉ.')
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
      setError('')
    } catch {
      setError('Không thể lưu lịch nghỉ học. Vui lòng kiểm tra dữ liệu.')
    }
  }

  const submitMakeup = async () => {
    if (!makeupForm.class_schedule_id || !makeupForm.date) {
      setError('Vui lòng chọn lịch học và ngày học bù.')
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
      setError('')
    } catch {
      setError('Không thể lưu lịch học bù. Vui lòng kiểm tra dữ liệu.')
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
      setError('Không thể xoá lịch nghỉ học bù.')
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải thời khóa biểu...</div>
  }

  if (error && !form.subject_id && !editingId && schedules.length === 0 && !periods.length) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
  }
return (
  <>
    {cancelTarget && (
      <div
        className="cancel-modal-backdrop"
        onClick={() => setCancelTarget(null)}
      >
        <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="cancel-modal__title">Nghỉ học</h2>

          <p className="cancel-modal__prompt">
            Bạn muốn cho môn này nghỉ vào ngày:
          </p>

          <div className="cancel-modal__details">
            <p>
              <strong>Môn học:</strong>{' '}
              {subjects.find((s) => s.id === cancelTarget.schedule.subject_id)?.name ?? 'N/A'}
            </p>
            <p>
              <strong>Ngày:</strong> {cancelTarget.date}
            </p>
            <p>
              <strong>Tiết:</strong>{' '}
              {cancelTarget.schedule.start_period}
              {' - '}
              {cancelTarget.schedule.end_period}
            </p>
            <p>
              <strong>Phòng:</strong>{' '}
              {cancelTarget.schedule.room || 'Không có'}
            </p>
          </div>

          <div className="cancel-modal__reason">
            <label className="cancel-modal__label">Lý do</label>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ví dụ: Giảng viên cho nghỉ"
              className="cancel-modal__input"
            />
          </div>

          <div className="cancel-modal__actions">
            <button type="button" onClick={() => setCancelTarget(null)} className="cancel-modal__button cancel-modal__button--secondary">
              Hủy
            </button>

            <button
              type="button"
              onClick={confirmCancel}
              disabled={cancelLoading}
              className="cancel-modal__button cancel-modal__button--danger"
            >
              {cancelLoading ? 'Đang lưu...' : 'Xác nhận nghỉ'}
            </button>
          </div>
        </div>
      </div>
    )}

    <InlineScheduleEditor
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      schedule={editingSchedule}
      onSave={handleSaveSchedule}
      subjects={subjects}
      periods={periods}
      contextMenu={
        contextMenu
          ? {
              x: contextMenu.x,
              y: contextMenu.y,
              onEdit: () => handleEditSchedule(contextMenu.schedule),
              onCancel: () => handleOpenCancelModal(contextMenu.schedule, contextMenu.date),
              onMakeup: () => handleOpenMakeupScheduler(contextMenu.schedule, contextMenu.date),
            }
          : undefined
      }
      onContextMenuClose={() => setContextMenu(null)}
    />

    {makeupTarget && (
      <MakeupScheduler
        isOpen={!!makeupTarget}
        onClose={() => setMakeupTarget(null)}
        onSave={handleSaveMakeup}
        schedule={makeupTarget.schedule}
        overrideToEdit={makeupTarget.overrideToEdit}
        subjects={subjects}
        periods={periods}
      />
    )}

    <div className="schedule-page">
      <div className="schedule-timetable-card">
        <Timetable
          subjects={subjects}
          schedules={schedules}
          periods={periods}
          scheduleOverrides={scheduleOverrides}
          onScheduleClick={handleScheduleInteraction}
          onScheduleContextMenu={handleScheduleInteraction}
          onAddSchedule={handleAddNewSchedule}
        />
      </div>

      <div className="schedule-layout">
        <section className="schedule-card schedule-form-card">
          <div className="schedule-card__header">
            <div>
              <h3 className="schedule-card__title">{editingId ? 'Chỉnh sửa lịch học' : 'Thêm lịch học'}</h3>
              <p className="schedule-card__subtitle">Điều chỉnh tiết học và phòng học theo từng môn.</p>
            </div>
          </div>

          {error && <div className="schedule-alert">{error}</div>}

          <div className="schedule-form-grid">
            <label className="schedule-field schedule-field--full">
              <span>Môn học</span>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                className="schedule-input"
              >
                <option value="">-- Chọn môn --</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </label>

            <label className="schedule-field">
              <span>Thứ</span>
              <select
                value={form.weekday}
                onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
                className="schedule-input"
              >
                {weekdayOptions.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </label>

            <label className="schedule-field">
              <span>Phòng</span>
              <input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="VD: P6"
                className="schedule-input"
              />
            </label>

            <label className="schedule-field">
              <span>Tiết bắt đầu</span>
              <select
                value={form.start_period}
                onChange={(e) => setForm({ ...form, start_period: Number(e.target.value) })}
                className="schedule-input"
              >
                {periodOptions.map((period) => (
                  <option key={period.id} value={period.period_number}>Tiết {period.period_number}</option>
                ))}
              </select>
            </label>

            <label className="schedule-field">
              <span>Tiết kết thúc</span>
              <select
                value={form.end_period}
                onChange={(e) => setForm({ ...form, end_period: Number(e.target.value) })}
                className="schedule-input"
              >
                {periodOptions.map((period) => (
                  <option key={period.id} value={period.period_number}>Tiết {period.period_number}</option>
                ))}
              </select>
            </label>

            <label className="schedule-field">
              <span>Tuần bắt đầu</span>
              <input
                type="number"
                min={1}
                value={form.week_start}
                onChange={(e) => setForm({ ...form, week_start: Number(e.target.value) })}
                className="schedule-input"
              />
            </label>

            <label className="schedule-field">
              <span>Tuần kết thúc</span>
              <input
                type="number"
                min={1}
                value={form.week_end}
                onChange={(e) => setForm({ ...form, week_end: Number(e.target.value) })}
                className="schedule-input"
              />
            </label>

            <label className="schedule-field schedule-field--full">
              <span>Ghi chú</span>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                className="schedule-input schedule-textarea"
              />
            </label>
          </div>

          <div className="schedule-actions">
            <button type="button" onClick={submit} className="schedule-primary-button">
              {editingId ? 'Cập nhật' : 'Thêm mới'}
            </button>
            <button type="button" onClick={resetForm} className="schedule-secondary-button">
              Reset
            </button>
          </div>
        </section>

        <section className="schedule-card schedule-list-card">
          <h3 className="schedule-card__title">Danh sách lịch học</h3>
          <div className="schedule-list">
            {schedules.length === 0 ? (
              <div className="schedule-empty-state">Chưa có lịch học nào.</div>
            ) : (
              schedules.map((schedule) => {
                const subject = subjects.find((item) => item.id === schedule.subject_id)
                const weekdayLabel = weekdayOptions.find((day) => day.value === schedule.weekday)?.label ?? `Thứ ${schedule.weekday}`

                return (
                  <div key={schedule.id} className="schedule-item">
                    <div className="schedule-item__content">
                      <p className="schedule-item__name">{subject?.name ?? 'Môn học'}</p>
                      <p className="schedule-item__meta">
                        {weekdayLabel} · Tiết {schedule.start_period} - {schedule.end_period} · {schedule.room || 'Không có phòng'}
                      </p>
                      {schedule.note && <p className="schedule-item__note">{schedule.note}</p>}
                    </div>

                    <div className="schedule-item__actions">
                      <button type="button" onClick={() => startEdit(schedule)} className="schedule-action-button schedule-action-button--edit">
                        Sửa
                      </button>
                      <button type="button" onClick={() => remove(schedule.id)} className="schedule-action-button schedule-action-button--delete">
                        Xoá
                      </button>
                    </div>
                  </div>
                )
              })
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
      </section>
    </div>
  </>
)
  
}
