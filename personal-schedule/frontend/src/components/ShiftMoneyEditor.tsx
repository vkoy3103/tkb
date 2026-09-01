import React, { useEffect, useMemo, useState } from 'react'
import {
  ScheduleModal,
  FormGroup,
  ScheduleToast,
} from './ScheduleEditor'
import type { SettingsEntry, WorkExtra, WorkShift } from '../types'
import { getOtRate, settingsToRates } from '../utils/salary'

interface ShiftMoneyEditorProps {
  isOpen: boolean
  shift: WorkShift | null
  extras: WorkExtra[]
  settings: SettingsEntry[]
  onClose: () => void
  onSave: (
    shift: WorkShift,
    values: { npcHours: number; otHours: number; extendCount: number; coefficient: number },
  ) => Promise<void>
  onDelete: (shift: WorkShift) => Promise<void>
  isLoading?: boolean
}

// Hệ số ca phổ biến (ca lễ x2, x1.5...)
const COEFFICIENT_PRESETS = [1, 1.5, 2, 2.5, 3]

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Theo lịch',
  done: 'Đã làm',
  cancelled: 'Đã hủy',
}

function toMinutes(value?: string | null): number | null {
  if (!value) return null
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function calcNormalHours(shift: WorkShift): number {
  if (shift.status === 'cancelled') return 0
  const scheduledStart = toMinutes(shift.scheduled_start)
  const scheduledEnd = toMinutes(shift.scheduled_end)
  if (scheduledStart == null || scheduledEnd == null) return 0
  const start = toMinutes(shift.actual_start) ?? scheduledStart
  const actualEnd = toMinutes(shift.actual_end) ?? scheduledEnd
  const normalEnd = Math.min(actualEnd, scheduledEnd)
  return Math.max(0, (normalEnd - start) / 60)
}

const formatVND = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} VNĐ`

function parseNum(v: string): number {
  const n = Number(v)
  return Number.isNaN(n) || n < 0 ? 0 : n
}

// Ô nhập dạng nút − / giá trị / + , không cần gõ
function StepperField({
  label,
  value,
  step,
  helper,
  error,
  onChange,
  compact = false,
}: {
  label: string
  value: string
  step: number
  helper?: string
  error?: string
  onChange: (value: string) => void
  compact?: boolean
}) {
  const current = parseNum(value)
  const setFromNum = (n: number) => onChange(String(Math.round(n * 100) / 100))
  const stepper = (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        onClick={() => setFromNum(Math.max(0, current - step))}
        disabled={current <= 0}
        aria-label={`Giảm ${label}`}
      >
        −
      </button>
      <input
        type="number"
        className="stepper__input form-group__input"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="stepper__btn stepper__btn--plus"
        onClick={() => setFromNum(current + step)}
        aria-label={`Tăng ${label}`}
      >
        +
      </button>
    </div>
  )
  if (compact) return stepper
  return (
    <FormGroup label={label} helper={helper} error={error}>
      {stepper}
    </FormGroup>
  )
}

export function ShiftMoneyEditor({
  isOpen,
  shift,
  extras,
  settings,
  onClose,
  onSave,
  onDelete,
  isLoading = false,
}: ShiftMoneyEditorProps): React.ReactElement | null {
  const [npcHours, setNpcHours] = useState('')
  const [otHours, setOtHours] = useState('')
  const [extendCount, setExtendCount] = useState('')
  const [coefficient, setCoefficient] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const rates = useMemo(() => settingsToRates(settings), [settings])

  // Các hệ số để chọn nhanh (nút nhấn) — preset + giá trị hiện tại nếu nằm ngoài danh sách
  const coefChoices = useMemo(() => {
    const list = [...COEFFICIENT_PRESETS]
    const current = Number(coefficient) || 1
    if (!list.includes(current)) list.push(current)
    return list.sort((a, b) => a - b)
  }, [coefficient])

  useEffect(() => {
    if (!isOpen || !shift) return
    const qty = (code: string) => extras.find((e) => e.type === code)?.quantity ?? 0
    setNpcHours(String(qty('NPC')))
    setOtHours(String(qty('OT')))
    setExtendCount(String(qty('EXTEND')))
    setCoefficient(Number(shift.coefficient) || 1)
    setErrors({})
    setToast(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shift, extras])

  // Sau khi đóng modal (shift=null) mà còn toast thì vẫn hiển thị toast
  if (!shift) {
    return toast ? (
      <ScheduleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
    ) : null
  }

  const normalHours = calcNormalHours(shift)
  // Hệ số ca CHỈ nhân lương cơ bản (normal), không nhân NPC/OT/EXTEND
  const normalIncome = normalHours * (rates.NORMAL_RATE ?? 0) * coefficient
  const npcIncome = parseNum(npcHours) * (rates.NPC_RATE ?? 0)
  // OT = x2 lương ca thường (2 x NORMAL_RATE) — lấy từ util chung
  const otRate = getOtRate(rates)
  const otIncome = parseNum(otHours) * otRate
  const extendIncome = parseNum(extendCount) * (rates.EXTEND_RATE ?? 0)
  const total = normalIncome + npcIncome + otIncome + extendIncome

  const validate = () => {
    const next: Record<string, string> = {}
    if (Number(npcHours) < 0) next.npc = 'Không được âm'
    if (Number(otHours) < 0) next.ot = 'Không được âm'
    if (Number(extendCount) < 0) next.extend = 'Không được âm'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shift) return
    if (!validate()) return
    try {
      await onSave(
        shift,
        {
          npcHours: parseNum(npcHours),
          otHours: parseNum(otHours),
          extendCount: parseNum(extendCount),
          coefficient: Number(coefficient) || 1,
        },
      )
      // Đóng modal NGAY sau khi lưu thành công — không hiện thông báo popup
      onClose()
    } catch (error) {
      setToast({ message: `Lỗi: ${(error as Error).message}`, type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!shift) return
    try {
      await onDelete(shift)
      onClose()
    } catch (error) {
      setToast({ message: `Lỗi: ${(error as Error).message}`, type: 'error' })
    }
  }

  return (
    <>
      <ScheduleModal
        isOpen={isOpen}
        title={`Tiền ca · ${shift.shift_type}`}
        onClose={onClose}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Lưu tiền ca"
        closeLabel="Đóng"
        showDeleteButton
        onDelete={handleDelete}
        modalClassName="schedule-modal--money"
      >
        {/* Banner thông tin ca */}
        <div className="sm-header">
          <span className="sm-header__badge">{shift.shift_type}</span>
          <div className="sm-header__info">
            <div className="sm-header__date">{shift.date}</div>
            <div className="sm-header__time">
              {shift.scheduled_start} – {shift.scheduled_end} ·{' '}
              {STATUS_LABEL[shift.status || 'scheduled']}
            </div>
          </div>
          <div className="sm-header__hours">{calcNormalHours(shift).toFixed(1)}h</div>
        </div>

        {/* Hệ số ca — nút chọn nhanh */}
        <div className="sm-coef">
          <p className="sm-coef__label">
            Hệ số ca{Number(coefficient) > 1 ? ` · x${coefficient}` : ' · x1'}
          </p>
          <div className="sm-coef__btns">
            {coefChoices.map((v) => (
              <button
                key={v}
                type="button"
                className={`sm-coef__btn ${Number(coefficient) === v ? 'sm-coef__btn--active' : ''}`}
                onClick={() => setCoefficient(v)}
              >
                x{v}
              </button>
            ))}
          </div>
          <p className="sm-coef__hint">Chỉ nhân lương cơ bản, không nhân phụ thu</p>
        </div>

        {/* NPC / OT / EXTEND */}
        <div className="sm-extras">
          <div className="sm-extra sm-extra--npc">
            <div className="sm-extra__head">
              <span className="sm-extra__icon">💠</span>
              <span className="sm-extra__name">NPC</span>
            </div>
            <StepperField
              compact
              label="NPC (giờ)"
              value={npcHours}
              step={1}
              error={errors.npc}
              onChange={setNpcHours}
            />
            <div className="sm-extra__amount">{formatVND(npcIncome)}</div>
            <div className="sm-extra__rate">{(rates.NPC_RATE ?? 0).toLocaleString('vi-VN')}đ/giờ</div>
            {errors.npc && <div className="sm-extra__error">{errors.npc}</div>}
          </div>

          <div className="sm-extra sm-extra--ot">
            <div className="sm-extra__head">
              <span className="sm-extra__icon">🔥</span>
              <span className="sm-extra__name">OT</span>
            </div>
            <StepperField
              compact
              label="OT (giờ)"
              value={otHours}
              step={0.5}
              error={errors.ot}
              onChange={setOtHours}
            />
            <div className="sm-extra__amount">{formatVND(otIncome)}</div>
            <div className="sm-extra__rate">{otRate.toLocaleString('vi-VN')}đ/giờ (x2)</div>
            {errors.ot && <div className="sm-extra__error">{errors.ot}</div>}
          </div>

          <div className="sm-extra sm-extra--extend">
            <div className="sm-extra__head">
              <span className="sm-extra__icon">➕</span>
              <span className="sm-extra__name">EXTEND</span>
            </div>
            <StepperField
              compact
              label="EXTEND (lần)"
              value={extendCount}
              step={1}
              error={errors.extend}
              onChange={setExtendCount}
            />
            <div className="sm-extra__amount">{formatVND(extendIncome)}</div>
            <div className="sm-extra__rate">{(rates.EXTEND_RATE ?? 0).toLocaleString('vi-VN')}đ/lần</div>
            {errors.extend && <div className="sm-extra__error">{errors.extend}</div>}
          </div>
        </div>

        {/* Tổng tiền */}
        <div className="sm-total">
          <p className="sm-total__label">
            💰 Tổng tiền ca này{Number(coefficient) > 1 ? ` · x${coefficient}` : ''}
          </p>
          <p className="sm-total__amount">{formatVND(total)}</p>
          <p className="sm-total__breakdown">
            {normalHours.toFixed(1)}h ca thường{Number(coefficient) !== 1 ? ` × x${coefficient}` : ''} ·{' '}
            {parseNum(npcHours).toFixed(1)}h NPC · {parseNum(otHours).toFixed(1)}h OT ·{' '}
            {parseNum(extendCount)} EXTEND
          </p>
        </div>
      </ScheduleModal>

      {toast && <ScheduleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
