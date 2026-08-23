import api from './api'
import type { Period } from '../types'

export async function fetchPeriods() {
  const response = await api.get<Period[]>('/periods')
  return response.data
}

export interface PeriodPayload {
  period_number: number
  start_time: string
  end_time: string
  label?: string | null
  note?: string | null
}

export async function createPeriod(payload: PeriodPayload) {
  const response = await api.post<Period>('/periods', payload)
  return response.data
}

export async function updatePeriod(id: number, payload: PeriodPayload) {
  const response = await api.put<Period>(`/periods/${id}`, payload)
  return response.data
}

export async function deletePeriod(id: number) {
  await api.delete(`/periods/${id}`)
}
