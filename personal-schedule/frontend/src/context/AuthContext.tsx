import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, type ScheduleMode, type UserInfo } from '../services/authApi'
import { getToken, setToken } from '../services/api'

interface AuthContextValue {
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  scheduleMode: ScheduleMode
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone_number?: string
    schedule_mode?: ScheduleMode
  }) => Promise<void>
  updateScheduleMode: (mode: ScheduleMode) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then((me) => setUser(me))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    setToken(res.access_token)
    setUser(res.user)
  }, [])

  const register = useCallback(
    async (payload: {
      email: string
      password: string
      first_name?: string
      last_name?: string
      phone_number?: string
      schedule_mode?: ScheduleMode
    }) => {
      await authApi.register(payload)
      // Đăng ký xong → tự đăng nhập luôn
      await login(payload.email, payload.password)
    },
    [login],
  )

  const updateScheduleMode = useCallback(async (mode: ScheduleMode) => {
    const updated = await authApi.updateScheduleMode(mode)
    setUser((cur) => (cur ? { ...cur, schedule_mode: updated.schedule_mode } : cur))
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // bỏ qua lỗi mạng
    }
    setToken(null)
    setUser(null)
  }, [])

  const scheduleMode: ScheduleMode = user?.schedule_mode ?? 'PERIOD'

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      scheduleMode,
      login,
      register,
      updateScheduleMode,
      logout,
    }),
    [user, isLoading, scheduleMode, login, register, updateScheduleMode, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
