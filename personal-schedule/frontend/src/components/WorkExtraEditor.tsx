import React, { useEffect, useMemo, useState } from 'react'
import {
  ScheduleModal,
  FormGroup,
  FormInput,
  FormRow,
  FormSelect,
  FormTextarea,
  ScheduleToast,
} from './ScheduleEditor'
import type { SettingsEntry, WorkExtra, WorkExtraType } from '../types'

interface WorkExtraEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<WorkExtra>) => Promise<void>
  onDelete?: () => Promise<void>
  extraToEdit?: WorkExtra | null
  extraTypes: WorkExtraType[]
  settings: SettingsEntry[]
  isLoading?: boolean
}

const emptyForm = {
  extra_type_id: '',
  quantity: '1',
  unit_price: '',
  note: '',
}

export function WorkExtraEditor({
  isOpen,
  onClose,
  onSave,
  onDelete,
  extraToEdit,
  extraTypes,
  settings,
  isLoading = false,
}: WorkExtraEditorProps): React.ReactElement | null {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const rates = useMemo(() => {
    const map: Record<string, number> = {}
    settings.forEach((s) => {
      if (s.key) {
        const value = Number(s.value)
        if (!Number.isNaN(value)) map[s.key] = value
      }
    })
    return map
  }, [settings])

  const resolvePrice = (type: WorkExtraType) => {
    // MULTIPLIER: đơn giá = hệ số x NORMAL_RATE; FIXED: đơn giá = rate_value
    if (type.rate_type === 'MULTIPLIER') {
      return type.rate_value * (rates.NORMAL_RATE ?? 0)
    }
    return type.rate_value
  }

  useEffect(() => {
    if (!isOpen) return
    const active = extraTypes.filter((t) => t.is_active)
    if (extraToEdit) {
      setForm({
        extra_type_id: String(extraToEdit.extra_type_id ?? ''),
        quantity: extraToEdit.quantity != null ? String(extraToEdit.quantity) : '',
        unit_price: extraToEdit.unit_price != null ? String(extraToEdit.unit_price) : '',
        note: extraToEdit.note ?? '',
      })
    } else {
      const firstType = active[0]
      setForm({
        extra_type_id: firstType ? String(firstType.id) : '',
        quantity: '1',
        unit_price: firstType ? String(resolvePrice(firstType)) : '',
        note: '',
      })
    }
    setErrors({})
    setToast(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, extraToEdit, extraTypes, rates])

  const activeTypes = extraTypes.filter((t) => t.is_active)
  const selectedType = activeTypes.find((t) => String(t.id) === form.extra_type_id)

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const type = activeTypes.find((t) => String(t.id) === id)
    setForm({
      ...form,
      extra_type_id: id,
      unit_price: type ? String(resolvePrice(type)) : '',
    })
  }

  const previewAmount = useMemo(() => {
    const qty = Number(form.quantity) || 0
    const price = Number(form.unit_price) || 0
    return Math.round(qty * price)
  }, [form.quantity, form.unit_price])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!form.extra_type_id) newErrors.extra_type_id = 'Vui lòng chọn loại phụ thu'
    if (form.quantity === '' || Number(form.quantity) < 0) newErrors.quantity = 'Số lượng phải >= 0'
    if (form.unit_price !== '' && Number(form.unit_price) < 0) newErrors.unit_price = 'Đơn giá phải >= 0'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await onSave({
        extra_type_id: Number(form.extra_type_id),
        quantity: form.quantity === '' ? null : Number(form.quantity),
        unit_price: form.unit_price === '' ? null : Number(form.unit_price),
        note: form.note.trim() || null,
      })
      setToast({ message: 'Đã lưu phụ thu!', type: 'success' })
      setTimeout(() => {
        onClose()
        setToast(null)
      }, 900)
    } catch (error) {
      setToast({ message: `Lỗi: ${(error as Error).message}`, type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    try {
      await onDelete()
      setToast({ message: 'Đã xóa phụ thu!', type: 'success' })
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
        title={extraToEdit ? 'Chỉnh sửa phụ thu' : 'Thêm phụ thu'}
        onClose={onClose}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Lưu phụ thu"
        showDeleteButton={!!extraToEdit}
        onDelete={handleDelete}
      >
        <FormRow>
          <FormSelect
            label="Loại phụ thu"
            required
            value={form.extra_type_id}
            onChange={handleTypeChange}
            error={errors.extra_type_id}
            options={activeTypes.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.rate_type === 'MULTIPLIER' ? `x${t.rate_value}` : `${t.rate_value}đ/${t.unit.toLowerCase()}`})`,
            }))}
          />
          <FormInput
            label="Số lượng"
            type="number"
            min={0}
            step="1"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            error={errors.quantity}
          />
        </FormRow>

        <FormRow>
          <FormInput
            label="Đơn giá"
            type="number"
            min={0}
            step="1000"
            value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
            helper={selectedType ? 'Tự động theo loại phụ thu, có thể chỉnh tay' : undefined}
            error={errors.unit_price}
          />
          <FormGroup label="Thành tiền">
            <div
              className="form-group__input"
              style={{
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600,
                color: '#0f172a',
                background: '#f0fdf4',
              }}
            >
              {previewAmount.toLocaleString('vi-VN')} VNĐ
            </div>
          </FormGroup>
        </FormRow>

        <FormTextarea
          label="Ghi chú"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="Ghi chú cho khoản phụ thu..."
        />
      </ScheduleModal>

      {toast && <ScheduleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
