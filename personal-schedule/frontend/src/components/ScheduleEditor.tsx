import React, { type ReactNode } from 'react'
import '../styles/schedule-editor.css'

interface ScheduleModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
  children?: ReactNode
  submitLabel?: string
  closeLabel?: string
  submitVariant?: 'primary' | 'danger'
  showDeleteButton?: boolean
  onDelete?: () => void
}

export function ScheduleModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  isLoading = false,
  children,
  submitLabel = 'Lưu',
  closeLabel = 'Đóng',
  submitVariant = 'primary',
  showDeleteButton = false,
  onDelete,
}: ScheduleModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="schedule-modal-backdrop" onClick={handleBackdropClick}>
      <div className={`schedule-modal ${isLoading ? 'schedule-modal--loading' : ''}`}>
        <div className="schedule-modal__header">
          <h2 className="schedule-modal__title">{title}</h2>
          <button type="button" className="schedule-modal__close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="schedule-modal__content">{children}</div>

          <div className="schedule-modal__footer">
            {showDeleteButton && onDelete && (
                <button
                  type="button"
                  className="btn btn--danger-outline btn--small"
                  onClick={onDelete}
                  disabled={isLoading}
                >
                  🗑️ Xóa
                </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={onClose}
              disabled={isLoading}
            >
              {closeLabel}
            </button>
            <button
              type="submit"
              className={`btn btn--${submitVariant} btn--small`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="schedule-spinner" />
                  Đang lưu...
                </>
              ) : (
                <>✓ {submitLabel}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface FormGroupProps {
  label: string
  required?: boolean
  error?: string
  helper?: string
  children?: ReactNode
}

export function FormGroup({ label, required = false, error, helper, children }: FormGroupProps) {
  return (
    <div className="form-group">
      <label className="form-group__label">
        {label}
        {required && <span style={{ color: '#dc2626' }}> *</span>}
        {helper && <span className="form-group__label-sub"> — {helper}</span>}
      </label>
      {children}
      {error && <div className="form-group__error">{error}</div>}
    </div>
  )
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  required?: boolean
  error?: string
  helper?: string
}

export function FormInput({
  label,
  required,
  error,
  helper,
  ...props
}: FormInputProps) {
  return (
    <FormGroup label={label || ''} required={required} error={error} helper={helper}>
      <input className="form-group__input" {...props} />
    </FormGroup>
  )
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  required?: boolean
  error?: string
  helper?: string
  options?: Array<{ value: string | number; label: string }>
}

export function FormSelect({
  label,
  required,
  error,
  helper,
  options = [],
  ...props
}: FormSelectProps) {
  return (
    <FormGroup label={label || ''} required={required} error={error} helper={helper}>
      <select className="form-group__select" {...props}>
        <option value="">-- Chọn --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormGroup>
  )
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  required?: boolean
  error?: string
  helper?: string
}

export function FormTextarea({
  label,
  required,
  error,
  helper,
  ...props
}: FormTextareaProps) {
  return (
    <FormGroup label={label || ''} required={required} error={error} helper={helper}>
      <textarea className="form-group__textarea" {...props} />
    </FormGroup>
  )
}

interface ScheduleToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
  autoClose?: boolean
}

export function ScheduleToast({
  message,
  type = 'info',
  onClose,
  autoClose = true,
}: ScheduleToastProps) {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, 3000)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose])

  return (
    <div className={`schedule-toast schedule-toast--${type}`}>
      <p className="schedule-toast__message">{message}</p>
      {onClose && (
        <button type="button" className="schedule-toast__close" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  )
}

interface ScheduleAlertProps {
  type?: 'info' | 'warning' | 'error' | 'success'
  message: string
  icon?: string
}

export function ScheduleAlert({
  type = 'info',
  message,
  icon,
}: ScheduleAlertProps) {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✓',
  }

  return (
    <div className={`schedule-alert schedule-alert--${type}`}>
      <div className="schedule-alert__icon">{icon || icons[type]}</div>
      <p className="schedule-alert__message">{message}</p>
    </div>
  )
}

interface ContextMenuProps {
  x: number
  y: number
  items: Array<{
    label: string
    icon?: string
    onClick: () => void
    danger?: boolean
  }>
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="schedule-context-menu"
      style={{ top: `${y}px`, left: `${x}px` }}
    >
      {items.map((item, index) => (
        <div key={index}>
          <button
            type="button"
            className={`schedule-context-menu__item ${item.danger ? 'schedule-context-menu__item--danger' : ''}`}
            onClick={() => {
              item.onClick()
              onClose()
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
          {index < items.length - 1 && <div className="schedule-context-menu__divider" />}
        </div>
      ))}
    </div>
  )
}

export function FormRow({ children }: { children?: ReactNode }) {
  return <div className="form-row">{children}</div>
}

export function ScheduleTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Array<{ id: string; label: string }>
  activeTab: string
  onTabChange: (id: string) => void
}) {
  return (
    <div className="schedule-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`schedule-tab ${activeTab === tab.id ? 'schedule-tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
