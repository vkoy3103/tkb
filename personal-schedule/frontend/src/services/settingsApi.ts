import api from './api'
import type { SettingsEntry } from '../types'

export async function fetchSettings() {
  const response = await api.get<SettingsEntry[]>('/settings')
  return response.data
}

export async function fetchSetting(key: string) {
  const response = await api.get<SettingsEntry>(`/settings/${encodeURIComponent(key)}`)
  return response.data
}

export async function createSetting(payload: { key: string; value?: string; description?: string }) {
  const response = await api.post<SettingsEntry>('/settings', payload)
  return response.data
}

export async function updateSetting(key: string, payload: { value?: string; description?: string }) {
  const response = await api.put<SettingsEntry>(`/settings/${encodeURIComponent(key)}`, payload)
  return response.data
}

export async function deleteSetting(key: string) {
  await api.delete(`/settings/${encodeURIComponent(key)}`)
}
