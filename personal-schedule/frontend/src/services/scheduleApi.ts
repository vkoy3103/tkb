import api from './api'
import type { Schedule } from '../types'

export async function fetchSchedules() {
  const response = await api.get<Schedule[]>('/schedules')
  return response.data
}

export async function createSchedule(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>) {
  const response = await api.post<Schedule>('/schedules', schedule)
  return response.data
}

export async function updateSchedule(scheduleId: number, schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>) {
  const response = await api.put<Schedule>(`/schedules/${scheduleId}`, schedule)
  return response.data
}

export async function deleteSchedule(scheduleId: number) {
  await api.delete(`/schedules/${scheduleId}`)
}
