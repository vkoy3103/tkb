import axios from 'axios'

// VITE_API_BASE_URL có thể ghi đè (vd: URL đầy đủ của backend khi tách frontend/backend).
// Mặc định dùng đường dẫn tương đối /api → chạy được cả khi backend phục vụ luôn frontend (production)
// lẫn khi dev qua Vite proxy.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- Auth token (lưu trong localStorage) ---
const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Xử lý 401: xóa token + chuyển về trang login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null)
      // Chỉ redirect khi đang ở SPA và không phải chính request login
      if (typeof window !== 'undefined' && !error.config?.url?.includes('/auth/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
