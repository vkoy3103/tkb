import api from './api'
import type { WorkExtraType } from '../types'

export async function fetchWorkExtraTypes() {
  const response = await api.get<WorkExtraType[]>('/work-extra-types')
  return response.data
}

export async function createWorkExtraType(payload: Omit<WorkExtraType, 'id'>) {
  const response = await api.post<WorkExtraType>('/work-extra-types', payload)
  return response.data
}

export async function updateWorkExtraType(workExtraTypeId: number, payload: Omit<WorkExtraType, 'id'>) {
  const response = await api.put<WorkExtraType>(`/work-extra-types/${workExtraTypeId}`, payload)
  return response.data
}

export async function deleteWorkExtraType(workExtraTypeId: number) {
  await api.delete(`/work-extra-types/${workExtraTypeId}`)
}
