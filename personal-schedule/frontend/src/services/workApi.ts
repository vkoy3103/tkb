import api from './api'
import type { WorkShift, WorkExtra } from '../types'

export async function fetchWorkShifts() {
  const response = await api.get<WorkShift[]>('/work-shifts')
  return response.data
}

export async function createWorkShift(payload: Omit<WorkShift, 'id' | 'scheduled_start' | 'scheduled_end' | 'created_at' | 'updated_at'>) {
  const response = await api.post<WorkShift>('/work-shifts', payload)
  return response.data
}

export async function updateWorkShift(workShiftId: number, payload: Omit<WorkShift, 'id' | 'scheduled_start' | 'scheduled_end' | 'created_at' | 'updated_at'>) {
  const response = await api.put<WorkShift>(`/work-shifts/${workShiftId}`, payload)
  return response.data
}

export async function deleteWorkShift(workShiftId: number) {
  await api.delete(`/work-shifts/${workShiftId}`)
}

export async function fetchWorkExtras() {
  const response = await api.get<WorkExtra[]>('/work-extras')
  return response.data
}

export async function createWorkExtra(payload: Omit<WorkExtra, 'id' | 'amount' | 'created_at'>) {
  const response = await api.post<WorkExtra>('/work-extras', payload)
  return response.data
}

export async function updateWorkExtra(workExtraId: number, payload: Omit<WorkExtra, 'id' | 'amount' | 'created_at'>) {
  const response = await api.put<WorkExtra>(`/work-extras/${workExtraId}`, payload)
  return response.data
}

export async function deleteWorkExtra(workExtraId: number) {
  await api.delete(`/work-extras/${workExtraId}`)
}
