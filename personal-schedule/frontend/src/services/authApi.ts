import api from './api'

export interface UserInfo {
  id: number
  email: string
  first_name?: string | null
  last_name?: string | null
  phone_number?: string | null
  picture?: string | null
  role: string
  credit_balance: number
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const { data } = await api.post<LoginResponse>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  async register(payload: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone_number?: string
  }): Promise<{ message: string; id: number; email: string }> {
    const { data } = await api.post('/auth/register', payload)
    return data
  },

  async me(): Promise<UserInfo> {
    const { data } = await api.get<UserInfo>('/auth/me')
    return data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
}
