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

export default api
