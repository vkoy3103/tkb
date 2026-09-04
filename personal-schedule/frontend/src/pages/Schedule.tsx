import { useEffect, useMemo, useState } from 'react'
import { Timetable } from '../components/timetable/Timetable'
import type { TimetableSchedule } from '../components/timetable/Timetable'
import { MakeupScheduler } from '../components/MakeupScheduler'
import { InlineScheduleEditor } from '../components/InlineScheduleEditor'
import { WeekShiftScheduler } from '../components/WeekShiftScheduler'
import { ShiftMoneyEditor } from '../components/ShiftMoneyEditor'
import { WorkShiftEditor } from './WorkShiftEditor'
import type { WeekShiftDraft } from '../components/WeekShiftScheduler'
import { useAuth } from '../context/AuthContext'
import { fetchPeriods } from '../services/periodApi'
import {
  createSchedule,
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

export default function SchedulePage() {
  const { scheduleMode } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([])
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([])
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải thời khóa biểu...</div>
  }

  if (error && schedules.length === 0 && !periods.length) {
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
        />
      </div>


    </div>
  </>
)
  
}
