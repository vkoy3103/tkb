import { useMemo, useState } from 'react'
import type { Schedule, Subject } from '../../types'
import {
  getCurrentStudyWeek,
  getSubjectEffectiveWeekRange,
  isRangeActiveInWeek,
} from '../../utils/studyWeek'

function formatWeekText(range: { start: number; end: number }) {
  if (range.end === Number.MAX_SAFE_INTEGER) return `${range.start}+`
  return `${range.start}-${range.end}`
}

const weekdayOptions = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
  { value: 8, label: 'Chủ nhật' },
]

type SubjectSidebarProps = {
  subjects: Subject[]
  schedules: Schedule[]
  studyWeek?: number
  onUpdateSubject?: (id: number, data: Partial<Subject>) => void | Promise<void>
  onDeleteSubject?: (id: number) => void | Promise<void>
  onUpdateSchedule?: (scheduleId: number, data: Partial<Schedule>) => void | Promise<void>
}

export function SubjectSidebar({
  subjects,
  schedules,
  studyWeek,
  onUpdateSubject,
  onDeleteSubject,
  onUpdateSchedule,
}: SubjectSidebarProps) {
  // Tuần hiển thị: theo tuần của thời khóa biểu nếu có, nếu không thì tuần hiện tại
  const currentWeek = studyWeek ?? getCurrentStudyWeek()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{
    name: string
    teacher: string
    default_room: string
    color: string
    weekday: string
    start_period: string
    end_period: string
    week_start: string
    week_end: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const visibleSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const range = getSubjectEffectiveWeekRange(subject, schedules)
      return isRangeActiveInWeek(range, currentWeek)
    })
  }, [subjects, schedules, currentWeek])

  const startEdit = (subject: Subject) => {
    // Hiện sẵn tuần mặc định: ưu tiên tuần của môn, nếu chưa khai báo thì lấy từ tuần hiệu lực (suy từ lịch học)
    const effective = getSubjectEffectiveWeekRange(subject, schedules)
    const subjectSchedule = schedules.find((s) => s.subject_id === subject.id)
    setEditingId(subject.id)
    setEditForm({
      name: subject.name,
      teacher: subject.teacher || '',
      default_room: subject.default_room || '',
      color: subject.color || '#22c55e',
      weekday: subjectSchedule ? String(subjectSchedule.weekday) : '2',
      start_period: subjectSchedule ? String(subjectSchedule.start_period) : '',
      end_period: subjectSchedule ? String(subjectSchedule.end_period) : '',
      week_start: subject.week_start != null ? String(subject.week_start) : effective ? String(effective.start) : '',
      week_end:
        subject.week_end != null
          ? String(subject.week_end)
          : effective && effective.end !== Number.MAX_SAFE_INTEGER
            ? String(effective.end)
            : '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async (subject: Subject) => {
    if (!editForm || !editForm.name.trim()) return
    setSaving(true)
    try {
      const weekStart = editForm.week_start.trim() ? Number(editForm.week_start) : null
      const weekEnd = editForm.week_end.trim() ? Number(editForm.week_end) : null
      await onUpdateSubject?.(subject.id, {
        name: editForm.name.trim(),
        teacher: editForm.teacher.trim() || null,
        default_room: editForm.default_room.trim() || null,
        color: editForm.color,
        week_start: weekStart,
        week_end: weekEnd,
      })

      // Cập nhật tiết học (thứ + tiết bắt đầu/kết thúc) cho các lịch học của môn
      const weekday = Number(editForm.weekday)
      const startPeriod = Number(editForm.start_period)
      const endPeriod = Number(editForm.end_period)
      const subjectSchedules = schedules.filter((s) => s.subject_id === subject.id)
      if (
        subjectSchedules.length > 0 &&
        !Number.isNaN(weekday) &&
        !Number.isNaN(startPeriod) &&
        !Number.isNaN(endPeriod) &&
        startPeriod <= endPeriod
      ) {
        await Promise.all(
          subjectSchedules.map((s) =>
            onUpdateSchedule?.(s.id, { weekday, start_period: startPeriod, end_period: endPeriod }),
          ),
        )
      }
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (subject: Subject) => {
    setSaving(true)
    try {
      await onDeleteSubject?.(subject.id)
      if (editingId === subject.id) cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="timetable-sidebar">
      <div className="timetable-sidebar__stack">
        <div>
          <div className="timetable-sidebar__header-row">
            <p className="timetable-sidebar__title">Subjects</p>
            <span className="timetable-sidebar__week">Tuần {Math.max(currentWeek, 1)}</span>
          </div>
          <div className="timetable-sidebar__list">
            {visibleSubjects.length === 0 ? (
              <p className="timetable-sidebar__empty">Chưa có môn học.</p>
            ) : (
              visibleSubjects.map((subject) => {
                const range = getSubjectEffectiveWeekRange(subject, schedules)
                const isEditing = editingId === subject.id
                return (
                  <div
                    key={subject.id}
                    className="timetable-sidebar__item timetable-sidebar__item--subject"
                    style={{
                      background: subject.color ? `${subject.color}1a` : '#f8fafc',
                      borderColor: subject.color ? `${subject.color}66` : '#e2e8f0',
                    }}
                  >
                    {isEditing && editForm ? (
                      <div className="timetable-sidebar__editor">
                        <div className="timetable-sidebar__editor-head">
                          <span className="timetable-sidebar__editor-title">✏️ Chỉnh sửa môn học</span>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="timetable-sidebar__editor-close"
                            title="Đóng"
                          >
                            ✕
                          </button>
                        </div>

                        <label className="timetable-sidebar__field">
                          <span className="timetable-sidebar__field-label">Tên môn</span>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="VD: Toán cao cấp"
                            className="timetable-sidebar__input"
                          />
                        </label>

                        <label className="timetable-sidebar__field">
                          <span className="timetable-sidebar__field-label">Giảng viên</span>
                          <input
                            value={editForm.teacher}
                            onChange={(e) => setEditForm({ ...editForm, teacher: e.target.value })}
                            placeholder="VD: Nguyễn Văn A"
                            className="timetable-sidebar__input"
                          />
                        </label>

                        <label className="timetable-sidebar__field">
                          <span className="timetable-sidebar__field-label">Phòng</span>
                          <input
                            value={editForm.default_room}
                            onChange={(e) => setEditForm({ ...editForm, default_room: e.target.value })}
                            placeholder="VD: B301"
                            className="timetable-sidebar__input"
                          />
                        </label>

                        <label className="timetable-sidebar__field">
                          <span className="timetable-sidebar__field-label">Thứ</span>
                          <select
                            value={editForm.weekday}
                            onChange={(e) => setEditForm({ ...editForm, weekday: e.target.value })}
                            className="timetable-sidebar__input"
                          >
                            {weekdayOptions.map((day) => (
                              <option key={day.value} value={day.value}>{day.label}</option>
                            ))}
                          </select>
                        </label>

                        <div className="timetable-sidebar__field">
                          <span className="timetable-sidebar__field-label">Tiết học</span>
                          <div className="timetable-sidebar__week-inputs">
                            <label className="timetable-sidebar__week-sub">
                              <span className="timetable-sidebar__week-sub-label">Từ</span>
                              <input
                                type="number"
                                min={1}
                                value={editForm.start_period}
                                onChange={(e) => setEditForm({ ...editForm, start_period: e.target.value })}
                                className="timetable-sidebar__input"
                              />
                            </label>
                            <span className="timetable-sidebar__week-sep">→</span>
                            <label className="timetable-sidebar__week-sub">
                              <span className="timetable-sidebar__week-sub-label">Đến</span>
                              <input
                                type="number"
                                min={1}
                                value={editForm.end_period}
                                onChange={(e) => setEditForm({ ...editForm, end_period: e.target.value })}
                                className="timetable-sidebar__input"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="timetable-sidebar__field">
                          <span className="timetable-sidebar__field-label">Tuần học</span>
                          <div className="timetable-sidebar__week-inputs">
                            <label className="timetable-sidebar__week-sub">
                              <span className="timetable-sidebar__week-sub-label">Từ</span>
                              <input
                                type="number"
                                min={1}
                                value={editForm.week_start}
                                onChange={(e) => setEditForm({ ...editForm, week_start: e.target.value })}
                                className="timetable-sidebar__input"
                              />
                            </label>
                            <span className="timetable-sidebar__week-sep">→</span>
                            <label className="timetable-sidebar__week-sub">
                              <span className="timetable-sidebar__week-sub-label">Đến</span>
                              <input
                                type="number"
                                min={1}
                                value={editForm.week_end}
                                onChange={(e) => setEditForm({ ...editForm, week_end: e.target.value })}
                                className="timetable-sidebar__input"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="timetable-sidebar__field">
                          <span className="timetable-sidebar__field-label">Màu sắc</span>
                          <div className="timetable-sidebar__editor-row">
                            <input
                              type="color"
                              value={editForm.color}
                              onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                              className="timetable-sidebar__color"
                            />
                            <span className="timetable-sidebar__credits-hint">{subject.credits} TC</span>
                          </div>
                        </div>

                        <div className="timetable-sidebar__editor-actions">
                          <button
                            type="button"
                            onClick={() => saveEdit(subject)}
                            disabled={saving}
                            className="timetable-sidebar__btn timetable-sidebar__btn--save"
                          >
                            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="timetable-sidebar__btn timetable-sidebar__btn--cancel"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(subject)}
                            disabled={saving}
                            className="timetable-sidebar__btn timetable-sidebar__btn--delete"
                          >
                            Xóa môn
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="timetable-sidebar__item-main">
                        <div className="timetable-sidebar__item-text">
                          <div className="timetable-sidebar__item-name" title={subject.name}>
                            {subject.name}
                          </div>
                          <div
                            className="timetable-sidebar__item-meta"
                            title={`${subject.default_room || 'No room'}${range ? ` · Tuần ${formatWeekText(range)}` : ''} · ${subject.credits} TC`}
                          >
                            <span>{subject.default_room || 'No room'}</span>
                            {range ? <span> · Tuần {formatWeekText(range)}</span> : null}
                            <span className="timetable-sidebar__item-credits"> · {subject.credits} TC</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => startEdit(subject)}
                          className="timetable-sidebar__edit-btn"
                          title="Chỉnh sửa môn học"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div>
          <p className="timetable-sidebar__title">Work shifts</p>
          <div className="timetable-sidebar__list">
            {[
              { name: 'SHIFT 1', time: '09:00 - 13:00' },
              { name: 'SHIFT 2', time: '13:00 - 18:00' },
              { name: 'SHIFT 3', time: '18:00 - 22:00' },
            ].map((shift) => (
              <div key={shift.name} className="timetable-sidebar__item timetable-sidebar__item--shift">
                <div className="timetable-sidebar__item-name">{shift.name}</div>
                <div className="timetable-sidebar__item-meta">{shift.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
