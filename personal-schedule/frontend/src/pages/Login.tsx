import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ScheduleMode } from '../services/authApi'
import '../styles/auth.css'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('PERIOD')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (next: 'login' | 'register') => {
    setMode(next)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (password.length < 6) {
          setError('Mật khẩu phải có ít nhất 6 ký tự')
          setLoading(false)
          return
        }
        await register({ email, password, first_name: firstName, last_name: lastName, phone_number: phone, schedule_mode: scheduleMode })
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-label">Personal Schedule Manager</p>
          <h1 className="auth-title">LOCAL planner</h1>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <label className="auth-field">
                <span>Họ</span>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nguyễn" />
              </label>
              <label className="auth-field">
                <span>Tên</span>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Văn A" />
              </label>
              <label className="auth-field">
                <span>Số điện thoại (tùy chọn)</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0123456789" />
              </label>
              <div className="auth-field">
                <span>Chế độ thời khóa biểu</span>
                <div className="auth-mode-options">
                  <button
                    type="button"
                    className={`auth-mode-option ${scheduleMode === 'PERIOD' ? 'auth-mode-option--active' : ''}`}
                    onClick={() => setScheduleMode('PERIOD')}
                  >
                    🕐 Theo tiết
                    <small>Dùng số tiết, cấu hình khung giờ ở Settings</small>
                  </button>
                  <button
                    type="button"
                    className={`auth-mode-option ${scheduleMode === 'TIME' ? 'auth-mode-option--active' : ''}`}
                    onClick={() => setScheduleMode('TIME')}
                  >
                    ⏱️ Theo giờ
                    <small>Nhập giờ trực tiếp (vd 07:00-09:00), không cần tiết</small>
                  </button>
                </div>
              </div>
            </>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" />
          </label>

          <label className="auth-field">
            <span>Mật khẩu</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : '••••••••'}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>
      </div>
    </div>
  )
} 
