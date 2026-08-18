import type { Schedule, Subject } from '../types'

// Tuần 1 của học kỳ bắt đầu từ 10/08/2026 (Thứ 2)
export const WEEK_1_START = new Date(2026, 7, 10) // 2026-08-10

// Tuần học tương ứng với 1 ngày bất kỳ (tuần 1 = tuần chứa 10/08)
export function getStudyWeek(date: Date): number {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((day.getTime() - WEEK_1_START.getTime()) / 86400000)
  return Math.floor(diffDays / 7) + 1
}

export function getCurrentStudyWeek(): number {
  return getStudyWeek(new Date())
}

// Lịch học có thuộc tuần studyWeek không (theo chính tuần của schedule)?
// week_start/week_end = null → coi như không giới hạn (luôn hiển thị)
export function isScheduleInWeek(
  schedule: Pick<Schedule, 'week_start' | 'week_end'>,
  studyWeek: number,
): boolean {
  if (schedule.week_start != null && schedule.week_start > studyWeek) return false
  if (schedule.week_end != null && schedule.week_end < studyWeek) return false
  return true
}

// Phạm vi tuần hiệu lực của MÔN:
// 1) Ưu tiên week_start/week_end khai báo trực tiếp trên môn
// 2) Nếu không → lấy [min week_start, max week_end] từ các lịch học của môn
// Trả về null nếu môn chưa khai báo tuần nào → luôn hiển thị
export function getSubjectEffectiveWeekRange(subject: Subject, schedules: Schedule[]) {
  if (subject.week_start != null || subject.week_end != null) {
    return {
      start: subject.week_start ?? 1,
      end: subject.week_end ?? Number.MAX_SAFE_INTEGER,
    }
  }
  const related = schedules.filter((s) => s.subject_id === subject.id)
  const starts = related.map((s) => s.week_start).filter((v): v is number => v != null)
  const ends = related.map((s) => s.week_end).filter((v): v is number => v != null)
  if (starts.length === 0 || ends.length === 0) return null
  return { start: Math.min(...starts), end: Math.max(...ends) }
}

// Môn còn hiệu lực trong tuần không? (chỉ ẩn khi ĐÃ hết tuần học; chưa khai báo tuần → luôn hiện)
export function isRangeActiveInWeek(
  range: { start: number; end: number } | null,
  week: number,
): boolean {
  if (!range) return true
  return range.end >= week
}
