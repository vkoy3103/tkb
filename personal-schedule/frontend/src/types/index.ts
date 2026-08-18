export interface Subject {
  id: number
  code?: string | null
  name: string
  credits: number
  teacher?: string | null
  default_room?: string | null
  color?: string | null
  note?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Period {
  id: number
  period_number: number
  start_time: string
  end_time: string
  label?: string | null
  note?: string | null
}

export interface Schedule {
  id: number
  subject_id: number
  weekday: number
  start_period: number
  end_period: number
  room?: string | null
  week_start?: number | null
  week_end?: number | null
  note?: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleOverride {
  id: number
  class_schedule_id: number
  date: string
  type: string
  new_date?: string | null
  new_start_period?: number | null
  new_end_period?: number | null
  new_room?: string | null
  reason?: string | null
  note?: string | null
  created_at: string
  updated_at: string
}

export interface WorkShift {
  id: number
  date: string
  shift_type: string
  scheduled_start: string
  scheduled_end: string
  actual_start?: string | null
  actual_end?: string | null
  status: string
  note?: string | null
  created_at: string
  updated_at: string
}

export interface WorkExtraType {
  id: number
  code: string
  name: string
  unit: string
  rate_type: string
  rate_value: number
  description?: string | null
  is_active: boolean
}

export interface WorkExtra {
  id: number
  work_shift_id: number
  extra_type_id?: number
  type?: string
  type_name?: string | null
  quantity?: number | null
  unit_price?: number | null
  amount: number
  start_time?: string | null
  end_time?: string | null
  note?: string | null
  created_at: string
}

export interface SettingsEntry {
  id: number
  key: string
  value?: string | null
  description?: string | null
  created_at: string
  updated_at: string
}

export interface Statistics {
  study_hours: number
  work_hours: number
  normal_hours: number
  npc_hours: number
  ot_hours: number
  extend_count: number
  normal_income: number
  npc_income: number
  ot_income: number
  extend_income: number
  total_income: number
}
