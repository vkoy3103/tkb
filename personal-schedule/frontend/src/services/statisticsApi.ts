import api from './api'
import type { Statistics } from '../types'

export async function fetchDayStatistics(date: string) {
  const response = await api.get<Statistics>('/statistics/day', { params: { date } })
  return response.data
}

export async function fetchWeekStatistics(date: string) {
  const response = await api.get<Statistics>('/statistics/week', { params: { date } })
  return response.data
}

export async function fetchMonthStatistics(date: string) {
  const response = await api.get<Statistics>('/statistics/month', { params: { date } })
  return response.data
}
