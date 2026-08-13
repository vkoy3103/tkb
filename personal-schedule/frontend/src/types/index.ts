export interface Subject {
  id: number
  name: string
  code?: string | null
  credits: number
  teacher?: string | null
  room?: string | null
  color?: string | null
  note?: string | null
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: number
  subject_id: number
  date: string
  start_time: string
  end_time: string
  status: "ACTIVE" | "CANCELLED" | "MAKEUP"
  note?: string | null
  created_at: string
  updated_at: string
}

export interface WorkShift {
  id: number
  date: string
  shift_number: number
  scheduled_start: string
  scheduled_end: string
  actual_start: string
  actual_end: string
  note?: string | null
  created_at: string
  updated_at: string
}

export interface WorkExtra {
  id: number
  work_shift_id: number
  type: "NPC" | "OT" | "EXTEND"
  hours?: number | null
  quantity?: number | null
  amount: number
  note?: string | null
  created_at: string
}

export interface Settings {
  id: number
  normal_rate: number
  npc_rate: number
  ot_rate: number
  extend_rate: number
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
