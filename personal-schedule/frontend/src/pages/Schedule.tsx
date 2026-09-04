import { useEffect, useMemo, useState } from 'react'
import { Timetable } from '../components/timetable/Timetable'
import type { TimetableSchedule } from '../components/timetable/Timetable'
import { MakeupScheduler } from '../components/MakeupScheduler'
import { InlineScheduleEditor } from '../components/InlineScheduleEditor'
import { WeekShiftScheduler } from '../components/WeekShiftScheduler'
import { ShiftMoneyEditor } from '../components/ShiftMoneyEditor'
import { WorkShiftEditor, FIXED_SHIFTS } from './WorkShiftEditor'
import type { WeekShiftDraft } from '../components/WeekShiftScheduler'
import { useAuth } from '../context/AuthContext'
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
import { deleteSubject, fetchSubjects, updateSubject } from '../services/subjectApi'
import {
  createWorkShift,
  createWorkShiftsBulk,
  deleteWorkShift,
  fetchWorkShifts,
  syncWorkShiftExtras,
} from '../services/workShiftApi'
import { fetchWorkExtras } from '../services/workExtraApi'
import { fetchSettings } from '../services/settingsApi'
import type {
  Period,
  Schedule,
  ScheduleOverride,
  SettingsEntry,
  Subject,
  WorkExtra,
  WorkShift,
} from '../types'
import '../styles/cancel-modal.css'

// Quy ước weekday theo DB: 2 = Thứ 2 ... 8 = Chủ nhật
const weekdayOptions = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
  { value: 8, label: 'Chủ nhật' },
]

const emptyForm = {
  subject_id: '',
  weekday: 2,
  start_period: 1,
  end_period: 2,
  start_time: '07:00',
  end_time: '09:00',
  room: '',
  week_start: 1,
  week_end: 16,
  note: '',
}

// "2026-09-07" -> "T2, 07/09/2026"
function slotDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()] ?? ''
  return `${wd}, ${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}/${dateStr.slice(0, 4)}`
}

export default function SchedulePage() {
  const { scheduleMode } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([])
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([])
  const [form, setForm] = useState(emptyForm)
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
  const [workExtras, setWorkExtras] = useState<WorkExtra[]>([])
  const [settings, setSettings] = useState<SettingsEntry[]>([])
  const [moneyShift, setMoneyShift] = useState<WorkShift | null>(null)
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false)
  // Thêm ca làm vào ô lịch bị nghỉ
  const [shiftPreset, setShiftPreset] = useState<Partial<WorkShift> | undefined>(undefined)
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // Ngày đang chọn để thêm ca làm khi bấm ô trống trên TKB
  const [slotPickerDate, setSlotPickerDate] = useState<string | null>(null)

  const workExtraMap = useMemo(() => {
    const map = new Map<number, WorkExtra[]>()
    workExtras.forEach((extra) => {
      const list = map.get(extra.work_shift_id) ?? []
      list.push(extra)
      map.set(extra.work_shift_id, list)
    })
    return map
  }, [workExtras])

  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
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

  const handleSaveShiftMoney = async (
    shift: WorkShift,
    values: { npcHours: number; otHours: number; extendCount: number; coefficient: number },
  ) => {
    setSaving(true)
    try {
      const updated = await syncWorkShiftExtras(shift.id, {
        npc_hours: values.npcHours,
        ot_hours: values.otHours,
        extend_count: values.extendCount,
        coefficient: values.coefficient,
      })
      // Cập nhật cục bộ — không gọi loadData() (tránh reset trang)
      setWorkShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      const extras = await fetchWorkExtras()
      setWorkExtras(extras)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteShiftMoney = async (shift: WorkShift) => {
    setSaving(true)
    try {
      await deleteWorkShift(shift.id)
      // Cập nhật cục bộ — không gọi loadData() (tránh reset trang)
      setWorkShifts((prev) => prev.filter((s) => s.id !== shift.id))
      setWorkExtras((prev) => prev.filter((e) => e.work_shift_id !== shift.id))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSchedule = async (data: Partial<Schedule>) => {
    const isTime = Boolean(data.start_time && data.end_time)
    const payload = {
      ...data,
      subject_id: Number(data.subject_id),
      weekday: Number(data.weekday),
      start_period: isTime ? null : data.start_period != null ? Number(data.start_period) : null,
      end_period: isTime ? null : data.end_period != null ? Number(data.end_period) : null,
      start_time: isTime ? data.start_time : null,
      end_time: isTime ? data.end_time : null,
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

  // Trả về true nếu nên mở context menu (lịch cố định bình thường)
  const runScheduleAction = async (schedule: TimetableSchedule, date: string): Promise<boolean> => {
    // Xử lý cho ca làm: mở hộp thoại chỉnh tiền ca
    if ('_isWork' in schedule && schedule._isWork) {
      const workShiftId = Number(String(schedule.id).replace('work-', ''))
      const shiftToEdit = workShifts.find((s) => s.id === workShiftId)
      if (shiftToEdit) {
        setMoneyShift(shiftToEdit)
      }
      return false
    }

    // 1. Xử lý cho lịch học bù
    if ('_isMakeup' in schedule && schedule._isMakeup) {
      const overrideId = Number(String(schedule.id).replace('makeup-', ''))
      if (isNaN(overrideId)) return false

      const overrideToEdit = scheduleOverrides.find((o) => o.id === overrideId)
      if (!overrideToEdit) return false

      const originalSchedule = schedules.find((s) => s.id === overrideToEdit.class_schedule_id)
      if (!originalSchedule) return false

      // Mở modal học bù ở chế độ chỉnh sửa
      setMakeupTarget({
        schedule: originalSchedule,
        date: overrideToEdit.date, // Ngày gốc của buổi học được bù
        overrideToEdit: overrideToEdit,
      })
      return false // Dừng lại ở đây, không mở context menu
    }

    // 2. Xử lý cho lịch học cố định đã được đánh dấu nghỉ
    const cancelOverride = scheduleOverrides.find(
      (o) => o.type === 'cancel' && Number(o.class_schedule_id) === Number(schedule.id) && o.date === date,
    )

    if (cancelOverride) {
      // Bỏ popup hỏi — bấm vào buổi nghỉ là hoàn tác nghỉ luôn
      try {
        await handleDeleteOverride(cancelOverride.id)
      } catch (error) {
        console.error('Failed to undo cancelled lesson:', error)
      }
      return false
    }

    // 3. Lịch học cố định, chưa nghỉ -> Mở context menu
    return true
  }

  const handleScheduleClick = async (schedule: TimetableSchedule, date: string) => {
    await runScheduleAction(schedule, date)
  }

  const handleScheduleContextMenu = async (e: React.MouseEvent, schedule: TimetableSchedule, date: string) => {
    e.preventDefault()
    const shouldOpenMenu = await runScheduleAction(schedule, date)
    if (shouldOpenMenu) {
      setContextMenu({ x: e.clientX, y: e.clientY, schedule: schedule as Schedule, date })
    }
  }

  const handleAddNewSchedule = () => {
    setEditingSchedule(null) // Đảm bảo không có schedule nào đang được chỉnh sửa
    setIsEditModalOpen(true)
  }

  const handleUpdateSubject = async (id: number, data: Partial<Subject>) => {
    const current = subjects.find((s) => s.id === id)
    if (!current) return
    try {
      const payload = {
        name: data.name ?? current.name,
        code: data.code !== undefined ? data.code : current.code,
        credits: current.credits,
        teacher: data.teacher !== undefined ? data.teacher : current.teacher,
        default_room: data.default_room !== undefined ? data.default_room : current.default_room,
        color: data.color !== undefined ? data.color : current.color,
        week_start: data.week_start !== undefined ? data.week_start : current.week_start,
        week_end: data.week_end !== undefined ? data.week_end : current.week_end,
        note: current.note,
        is_active: current.is_active,
      }
      const updated = await updateSubject(id, payload)
      setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch {
      console.error('Failed to update subject')
    }
  }

  const handleDeleteSubject = async (id: number) => {
    try {
      await deleteSubject(id)
      setSubjects((prev) => prev.filter((s) => s.id !== id))
    } catch {
      console.error('Failed to delete subject')
    }
  }

  const handleUpdateSchedule = async (scheduleId: number, data: Partial<Schedule>) => {
    try {
      const updated = await updateSchedule(scheduleId, data)
      setSchedules((current) => current.map((s) => (s.id === scheduleId ? updated : s)))
    } catch {
      console.error('Failed to update schedule')
    }
  }

  const handleSaveWorkShiftWeek = async (toCreate: WeekShiftDraft[], toDeleteIds: number[]) => {
    setSaving(true)
    try {
      // Tạo toàn bộ ca trong 1 request (nhanh hơn nhiều)
      const created = await createWorkShiftsBulk(toCreate)
      setWorkShifts((prev) => [...prev, ...created])
      if (toDeleteIds.length > 0) {
        await Promise.all(toDeleteIds.map((id) => deleteWorkShift(id)))
        setWorkShifts((prev) => prev.filter((s) => !toDeleteIds.includes(s.id)))
        setWorkExtras((prev) => prev.filter((e) => !toDeleteIds.includes(e.work_shift_id)))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAddWorkShiftWeek = () => {
    setIsWeekModalOpen(true)
  }

  // Bấm nút "➕ Thêm ca làm" trên ô lịch bị nghỉ → mở modal với ngày + giờ điền sẵn
  const handleAddWorkShiftFromCancel = (info: {
    schedule: TimetableSchedule
    date: string
    start: string
    end: string
  }) => {
    setShiftPreset({
      date: info.date,
      scheduled_start: info.start,
      scheduled_end: info.end,
      shift_type: 'SHIFT 1',
      status: 'scheduled',
    })
    setIsShiftModalOpen(true)
  }

  const handleSaveShiftFromCancel = async (data: Partial<WorkShift>) => {
    setSaving(true)
    try {
      const created = await createWorkShift(data)
      setWorkShifts((prev) => [...prev, created])
      setIsShiftModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  // ----- Bấm ô trống trên TKB → chọn SHIFT 1/2/3 để thêm ca làm -----
  const handleAddShiftSlot = (date: string) => {
    setSlotPickerDate(date)
  }

  const hasShiftOnDate = (date: string, shiftType: string) =>
    workShifts.some((s) => s.date === date && s.shift_type === shiftType)

  const handleChooseShiftSlot = async (date: string, shift: { value: string; start: string; end: string }) => {
    if (hasShiftOnDate(date, shift.value)) return
    setSaving(true)
    try {
      const data: Partial<WorkShift> = {
        date,
        shift_type: shift.value,
        scheduled_start: shift.start,
        scheduled_end: shift.end,
        status: 'scheduled',
      }
      const created = await createWorkShift(data)
      setWorkShifts((prev) => [...prev, created])
      setSlotPickerDate(null)
    } finally {
      setSaving(false)
    }
  }

  const closeSlotPicker = () => setSlotPickerDate(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [subjectData, scheduleData, periodData, overrideData, workShiftData, workExtraData, settingData] =
        await Promise.all([
          fetchSubjects(),
          fetchSchedules(),
          fetchPeriods(),
          fetchScheduleOverrides(),
          fetchWorkShifts(),
          fetchWorkExtras(),
          fetchSettings(),
        ])
      setSubjects(subjectData)
      setSchedules(scheduleData)
      setPeriods(periodData)
      setScheduleOverrides(overrideData)
      setWorkShifts(workShiftData)
      setWorkExtras(workExtraData)
      setSettings(settingData)
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

  const startEdit = (schedule: Schedule) => {
    setEditingId(schedule.id)
    setForm({
      subject_id: String(schedule.subject_id),
      weekday: schedule.weekday,
      start_period: schedule.start_period ?? 1,
      end_period: schedule.end_period ?? 2,
      start_time: (schedule.start_time ?? '07:00').slice(0, 5),
      end_time: (schedule.end_time ?? '09:00').slice(0, 5),
      room: schedule.room || '',
      week_start: schedule.week_start ?? 1,
      week_end: schedule.week_end ?? 16,
      note: schedule.note || '',
    })
  }

  const submit = async () => {
    const isTime = scheduleMode === 'TIME'
    const payload = {
      subject_id: Number(form.subject_id),
      weekday: Number(form.weekday),
      start_period: isTime ? null : Number(form.start_period),
      end_period: isTime ? null : Number(form.end_period),
      start_time: isTime ? form.start_time : null,
      end_time: isTime ? form.end_time : null,
      room: form.room || null,
      week_start: Number(form.week_start),
      week_end: Number(form.week_end),
      note: form.note || null,
    }

    if (!payload.subject_id) {
      setError('Vui lòng chọn môn học.')
      return
    }
    if (isTime) {
      if (!form.start_time || !form.end_time || form.end_time <= form.start_time) {
        setError('Giờ kết thúc phải sau giờ bắt đầu.')
        return
      }
    } else if (Number(form.start_period) > Number(form.end_period)) {
      setError('Tiết bắt đầu phải nhỏ hơn hoặc bằng tiết kết thúc.')
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
        onDelete={handleDeleteOverride}
        schedule={makeupTarget.schedule}
        overrideToEdit={makeupTarget.overrideToEdit}
        subjects={subjects}
        periods={periods}
      />
    )}

    <WeekShiftScheduler
      isOpen={isWeekModalOpen}
      onClose={() => setIsWeekModalOpen(false)}
      onSave={handleSaveWorkShiftWeek}
      isLoading={saving}
    />

    <WorkShiftEditor
      isOpen={isShiftModalOpen}
      onClose={() => setIsShiftModalOpen(false)}
      onSave={handleSaveShiftFromCancel}
      preset={shiftPreset}
      isLoading={saving}
    />

    <ShiftMoneyEditor
      isOpen={!!moneyShift}
      shift={moneyShift}
      extras={moneyShift ? (workExtraMap.get(moneyShift.id) ?? []) : []}
      settings={settings}
      onClose={() => setMoneyShift(null)}
      onSave={handleSaveShiftMoney}
      onDelete={handleDeleteShiftMoney}
      isLoading={saving}
    />

    {/* Hộp chọn SHIFT khi bấm ô trống trên TKB */}
    {slotPickerDate && (
      <div className="slot-picker-backdrop" onClick={closeSlotPicker}>
        <div className="slot-picker" onClick={(e) => e.stopPropagation()}>
          <div className="slot-picker__head">
            <span className="slot-picker__title">🕒 Thêm ca làm</span>
            <button type="button" className="slot-picker__close" onClick={closeSlotPicker} title="Đóng">
              ✕
            </button>
          </div>
          <p className="slot-picker__date">{slotDateLabel(slotPickerDate)} · Chọn ca cần thêm:</p>
          <div className="slot-picker__list">
            {FIXED_SHIFTS.map((shift) => {
              const exists = hasShiftOnDate(slotPickerDate, shift.value)
              return (
                <button
                  key={shift.value}
                  type="button"
                  className={`slot-picker__option${exists ? ' slot-picker__option--disabled' : ''}`}
                  disabled={exists}
                  onClick={() => handleChooseShiftSlot(slotPickerDate, shift)}
                >
                  <span className="slot-picker__opt-name">{shift.value}</span>
                  <span className="slot-picker__opt-time">
                    {shift.start} – {shift.end}
                  </span>
                  <span className="slot-picker__opt-state">{exists ? 'Đã có' : '＋ Thêm'}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )}

    <div className="schedule-page">
      <div className="schedule-timetable-card">
        <Timetable
          subjects={subjects}
          schedules={schedules}
          periods={periods}
          scheduleOverrides={scheduleOverrides}
          workShifts={workShifts}
          workExtras={workExtras}
          settings={settings}
          scheduleMode={scheduleMode}
          onScheduleClick={handleScheduleClick}
          onScheduleContextMenu={handleScheduleContextMenu}
          onAddSchedule={handleAddNewSchedule}
          onAddWorkShiftWeek={handleAddWorkShiftWeek}
          onAddWorkShiftFromCancel={handleAddWorkShiftFromCancel}
          onUpdateSubject={handleUpdateSubject}
          onDeleteSubject={handleDeleteSubject}
          onUpdateSchedule={handleUpdateSchedule}
          onAddShiftSlot={handleAddShiftSlot}
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

            {scheduleMode === 'TIME' ? (
              <>
                <label className="schedule-field">
                  <span>Giờ bắt đầu</span>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="schedule-input"
                  />
                </label>
                <label className="schedule-field">
                  <span>Giờ kết thúc</span>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="schedule-input"
                  />
                </label>
              </>
            ) : (
              <>
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
              </>
            )}

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
                const timeLabel =
                  schedule.start_time && schedule.end_time
                    ? `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`
                    : `Tiết ${schedule.start_period} - ${schedule.end_period}`

                return (
                  <div key={schedule.id} className="schedule-item">
                    <div className="schedule-item__content">
                      <p className="schedule-item__name">{subject?.name ?? 'Môn học'}</p>
                      <p className="schedule-item__meta">
                        {weekdayLabel} · {timeLabel} · {schedule.room || 'Không có phòng'}
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

    </div>
  </>
)
  
}
