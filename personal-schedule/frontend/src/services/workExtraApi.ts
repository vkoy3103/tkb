import api from './api'
import type { WorkExtra } from '../types'

export async function fetchWorkExtras() {
  const response = await api.get<WorkExtra[]>('/work-extras')
  return response.data
}

export async function createWorkExtra(payload: Omit<WorkExtra, 'id' | 'created_at'>) {
  const response = await api.post<WorkExtra>('/work-extras', payload)
  return response.data
}

export async function updateWorkExtra(workExtraId: number, payload: Omit<WorkExtra, 'id' | 'created_at'>) {
  const response = await api.put<WorkExtra>(`/work-extras/${workExtraId}`, payload)
  return response.data
}

export async function deleteWorkExtra(workExtraId: number) {
  await api.delete(`/work-extras/${workExtraId}`)
}
