import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, type UserInfo } from '../services/authApi'
import { getToken, setToken } from '../services/api'

interface AuthContextValue {
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone_number?: string
  }) => Promise<void>
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
    async (payload: { email: string; password: string; first_name?: string; last_name?: string; phone_number?: string }) => {
      await authApi.register(payload)
      // Đăng ký xong → tự đăng nhập luôn
      await login(payload.email, payload.password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // bỏ qua lỗi mạng
    }
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
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
