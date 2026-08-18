import api from './api'
import type { WorkShift } from '../types'

export async function fetchWorkShifts() {
  const response = await api.get<WorkShift[]>('/work-shifts')
  return response.data
}

export async function createWorkShift(payload: Partial<Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>>) {
  const response = await api.post<WorkShift>('/work-shifts', payload)
  return response.data
}

export async function updateWorkShift(workShiftId: number, payload: Partial<Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>>) {
  const response = await api.put<WorkShift>(`/work-shifts/${workShiftId}`, payload)
  return response.data
}

export async function deleteWorkShift(workShiftId: number) {
  await api.delete(`/work-shifts/${workShiftId}`)
}

export async function syncWorkShiftExtras(
  workShiftId: number,
  payload: { status?: string; npc_hours?: number; ot_hours?: number; extend_count?: number },
) {
  const response = await api.put<WorkShift>(`/work-shifts/${workShiftId}/extras`, payload)
  return response.data
}
