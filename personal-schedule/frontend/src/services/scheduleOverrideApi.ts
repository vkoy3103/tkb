import api from './api'
import type { ScheduleOverride } from '../types'

export async function fetchScheduleOverrides() {
  const response = await api.get<ScheduleOverride[]>('/schedule-overrides')
  return response.data
}

export async function createScheduleOverride(payload: Omit<ScheduleOverride, 'id' | 'created_at' | 'updated_at'>) {
  const response = await api.post<ScheduleOverride>('/schedule-overrides', payload)
  return response.data
}

export async function updateScheduleOverride(scheduleOverrideId: number, payload: Omit<ScheduleOverride, 'id' | 'created_at' | 'updated_at'>) {
  const response = await api.put<ScheduleOverride>(`/schedule-overrides/${scheduleOverrideId}`, payload)
  return response.data
}

export async function deleteScheduleOverride(scheduleOverrideId: number) {
  await api.delete(`/schedule-overrides/${scheduleOverrideId}`)
}
