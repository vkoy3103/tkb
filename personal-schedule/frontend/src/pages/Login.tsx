import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (next: 'login' | 'register') => {
    setMode(next)
    setError('')
    setConfirmPassword('')
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
        if (password !== confirmPassword) {
          setError('Mật khẩu nhập lại không khớp')
          setLoading(false)
          return
        }
        await register({ email, password })
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

          {mode === 'register' && (
            <label className="auth-field">
              <span>Nhập lại mật khẩu</span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

        <div className="auth-alt">
          <button type="button" className="auth-alt__link" onClick={() => navigate('/cash-balance')}>
            💰 Vào Cash balance (không cần đăng nhập)
          </button>
        </div>
      </div>
    </div>
  )
}
