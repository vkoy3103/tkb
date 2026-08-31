import React, { useEffect, useMemo, useState } from 'react'
import {
  ScheduleModal,
  FormGroup,
  FormRow,
  FormSelect,
  ScheduleToast,
} from './ScheduleEditor'
import type { SettingsEntry, WorkExtra, WorkShift } from '../types'
import { getOtRate, settingsToRates } from '../utils/salary'

const statusOptions = [
  { value: 'scheduled', label: 'Theo lịch' },
  { value: 'done', label: 'Đã làm' },
  { value: 'cancelled', label: 'Đã hủy' },
]

interface ShiftMoneyEditorProps {
  isOpen: boolean
  shift: WorkShift | null
  extras: WorkExtra[]
  settings: SettingsEntry[]
  onClose: () => void
  onSave: (
    shift: WorkShift,
    values: { npcHours: number; otHours: number; extendCount: number; coefficient: number },
    status: string,
  ) => Promise<void>
  onDelete: (shift: WorkShift) => Promise<void>
  isLoading?: boolean
}

// Hệ số ca phổ biến (ca lễ x2, x1.5...)
const COEFFICIENT_PRESETS = [1, 1.5, 2, 2.5, 3]

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
}: {
  label: string
  value: string
  step: number
  helper?: string
  error?: string
  onChange: (value: string) => void
}) {
  const current = parseNum(value)
  const setFromNum = (n: number) => onChange(String(Math.round(n * 100) / 100))
  return (
    <FormGroup label={label} helper={helper} error={error}>
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
  const [status, setStatus] = useState('scheduled')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const rates = useMemo(() => settingsToRates(settings), [settings])

  // Các lựa chọn hệ số: preset + giá trị hiện tại nếu không nằm trong preset
  const coefficientOptions = useMemo(() => {
    const opts = COEFFICIENT_PRESETS.map((v) => ({ value: v, label: `x${v}` }))
    const current = Number(coefficient) || 1
    if (!COEFFICIENT_PRESETS.includes(current)) {
      opts.push({ value: current, label: `x${current}` })
    }
    return opts
  }, [coefficient])

  useEffect(() => {
    if (!isOpen || !shift) return
    const qty = (code: string) => extras.find((e) => e.type === code)?.quantity ?? 0
    setNpcHours(String(qty('NPC')))
    setOtHours(String(qty('OT')))
    setExtendCount(String(qty('EXTEND')))
    setCoefficient(Number(shift.coefficient) || 1)
    setStatus(shift.status || 'scheduled')
    setErrors({})
    setToast(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shift, extras])

  if (!shift) return null

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
        status,
      )
      setToast({ message: 'Đã lưu tiền ca này!', type: 'success' })
      setTimeout(() => {
        onClose()
        setToast(null)
      }, 900)
    } catch (error) {
      setToast({ message: `Lỗi: ${(error as Error).message}`, type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!shift) return
    try {
      await onDelete(shift)
      setToast({ message: 'Đã xóa ca!', type: 'success' })
      setTimeout(() => {
        onClose()
        setToast(null)
      }, 900)
    } catch (error) {
      setToast({ message: `Lỗi: ${(error as Error).message}`, type: 'error' })
    }
  }

  return (
    <>
      <ScheduleModal
        isOpen={isOpen}
        title={`Tiền ca · ${shift.shift_type} · ${shift.date}`}
        onClose={onClose}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Lưu tiền ca"
        closeLabel="Đóng"
        showDeleteButton
        onDelete={handleDelete}
      >
        <p style={{ margin: '0 0 4px', fontSize: 12.5, color: '#64748b' }}>
          Ca {shift.scheduled_start} – {shift.scheduled_end} · {calcNormalHours(shift).toFixed(1)} giờ ca thường
        </p>

        <FormRow>
          <FormSelect
            label="Trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={statusOptions}
          />
          <FormSelect
            label="Hệ số ca"
            value={coefficient}
            onChange={(e) => setCoefficient(Number(e.target.value) || 1)}
            options={coefficientOptions}
            helper="Chỉ nhân lương cơ bản, không nhân phụ thu"
          />
        </FormRow>

        <FormRow>
          <StepperField
            label="NPC (giờ)"
            value={npcHours}
            step={1}
            helper={`${(rates.NPC_RATE ?? 0).toLocaleString('vi-VN')}đ/giờ`}
            error={errors.npc}
            onChange={setNpcHours}
          />
          <StepperField
            label="OT (giờ)"
            value={otHours}
            step={0.5}
            helper={`${otRate.toLocaleString('vi-VN')}đ/giờ (x2)`}
            error={errors.ot}
            onChange={setOtHours}
          />
        </FormRow>

        <FormRow>
          <StepperField
            label="EXTEND (lần)"
            value={extendCount}
            step={1}
            helper={`${(rates.EXTEND_RATE ?? 0).toLocaleString('vi-VN')}đ/lần`}
            error={errors.extend}
            onChange={setExtendCount}
          />
        </FormRow>

        <div
          style={{
            marginTop: 14,
            border: '1px solid #bbf7d0',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: '#047857', fontWeight: 600 }}>
            Tổng tiền ca này{Number(coefficient) > 1 ? ` · x${coefficient}` : ''}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800, color: '#065f46', lineHeight: 1.1 }}>
            {formatVND(total)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#047857', lineHeight: 1.5 }}>
            {normalHours.toFixed(1)}h ca thường{Number(coefficient) !== 1 ? ` × x${coefficient}` : ''} ·{' '}
            {parseNum(npcHours).toFixed(1)}h NPC · {parseNum(otHours).toFixed(1)}h OT · {parseNum(extendCount)} EXTEND
          </p>
        </div>
      </ScheduleModal>

      {toast && <ScheduleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
