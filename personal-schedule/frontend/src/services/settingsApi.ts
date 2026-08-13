import api from './api'
import type { Settings } from '../types'

export async function fetchSettings() {
  const response = await api.get<Settings>('/settings')
  return response.data
}

export async function updateSettings(payload: Omit<Settings, 'id' | 'created_at' | 'updated_at'>) {
  const response = await api.put<Settings>('/settings', payload)
  return response.data
}
