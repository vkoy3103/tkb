import api from './api'
import type { Period } from '../types'

export async function fetchPeriods() {
  const response = await api.get<Period[]>('/periods')
  return response.data
}
