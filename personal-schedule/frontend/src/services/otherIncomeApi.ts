import api from './api'
import type { OtherIncome } from '../types'

export type OtherIncomePayload = {
  date: string
  note?: string | null
  amount: number
}

export async function fetchOtherIncomes() {
  const response = await api.get<OtherIncome[]>('/other-incomes')
  return response.data
}

export async function createOtherIncome(payload: OtherIncomePayload) {
  const response = await api.post<OtherIncome>('/other-incomes', payload)
  return response.data
}

export async function updateOtherIncome(otherIncomeId: number, payload: Partial<OtherIncomePayload>) {
  const response = await api.put<OtherIncome>(`/other-incomes/${otherIncomeId}`, payload)
  return response.data
}

export async function deleteOtherIncome(otherIncomeId: number) {
  await api.delete(`/other-incomes/${otherIncomeId}`)
}
