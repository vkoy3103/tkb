import api from './api'
import type { Subject } from '../types'

export async function fetchSubjects() {
  const response = await api.get<Subject[]>('/subjects')
  return response.data
}

export async function createSubject(subject: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) {
  const response = await api.post<Subject>('/subjects', subject)
  return response.data
}

export async function updateSubject(subjectId: number, subject: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) {
  const response = await api.put<Subject>(`/subjects/${subjectId}`, subject)
  return response.data
}

export async function deleteSubject(subjectId: number) {
  await api.delete(`/subjects/${subjectId}`)
}
