from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.schedule import Schedule
from app.models.work_extra import WorkExtra
from app.models.work_shift import WorkShift
from app.services.settings_service import get_settings


def calculate_work_shift_normal_hours(shift: WorkShift) -> float:
    start = datetime.combine(shift.date, shift.actual_start)
    normal_end = min(
        datetime.combine(shift.date, shift.actual_end),
        datetime.combine(shift.date, shift.scheduled_end),
    )
    return max(0.0, (normal_end - start).total_seconds() / 3600.0)


def calculate_work_shift_ot_hours(shift: WorkShift) -> float:
    if shift.actual_end <= shift.scheduled_end:
        return 0.0
    ot_start = datetime.combine(shift.date, shift.scheduled_end)
    ot_end = datetime.combine(shift.date, shift.actual_end)
    return max(0.0, (ot_end - ot_start).total_seconds() / 3600.0)


def get_shifts_in_range(db: Session, start_date: date, end_date: date) -> list[WorkShift]:
    return db.query(WorkShift).filter(WorkShift.date >= start_date, WorkShift.date <= end_date).all()


def get_extras_in_range(db: Session, start_date: date, end_date: date) -> list[WorkExtra]:
    return db.query(WorkExtra).join(WorkShift).filter(WorkShift.date >= start_date, WorkShift.date <= end_date).all()


def get_study_hours(db: Session, start_date: date, end_date: date) -> float:
    schedules = db.query(Schedule).filter(Schedule.date >= start_date, Schedule.date <= end_date, Schedule.status != "CANCELLED").all()
    total = 0.0
    for schedule in schedules:
        total += max(0.0, (datetime.combine(schedule.date, schedule.end_time) - datetime.combine(schedule.date, schedule.start_time)).total_seconds() / 3600.0)
    return total


def make_statistics(db: Session, start_date: date, end_date: date) -> dict:
    settings = get_settings()
    shifts = get_shifts_in_range(db, start_date, end_date)
    extras = get_extras_in_range(db, start_date, end_date)
    study_hours = get_study_hours(db, start_date, end_date)

    normal_hours = sum(calculate_work_shift_normal_hours(shift) for shift in shifts)
    ot_hours = sum(calculate_work_shift_ot_hours(shift) for shift in shifts)
    npc_hours = sum(extra.hours or 0.0 for extra in extras if extra.type == "NPC")
    extend_count = sum(extra.quantity or 0 for extra in extras if extra.type == "EXTEND")

    normal_income = int(round(normal_hours * settings.normal_rate))
    ot_income = int(round(ot_hours * settings.ot_rate))
    npc_income = int(round(npc_hours * settings.npc_rate))
    extend_income = int(round(extend_count * settings.extend_rate))

    return {
        "study_hours": round(study_hours, 2),
        "work_hours": round(normal_hours + npc_hours + ot_hours, 2),
        "normal_hours": round(normal_hours, 2),
        "npc_hours": round(npc_hours, 2),
        "ot_hours": round(ot_hours, 2),
        "extend_count": extend_count,
        "normal_income": normal_income,
        "npc_income": npc_income,
        "ot_income": ot_income,
        "extend_income": extend_income,
        "total_income": normal_income + npc_income + ot_income + extend_income,
    }


def day_statistics(db: Session, date_value: date) -> dict:
    return make_statistics(db, date_value, date_value)


def week_statistics(db: Session, date_value: date) -> dict:
    start = date_value - timedelta(days=date_value.weekday())
    end = start + timedelta(days=6)
    return make_statistics(db, start, end)


def month_statistics(db: Session, date_value: date) -> dict:
    start = date_value.replace(day=1)
    if date_value.month == 12:
        end = date_value.replace(year=date_value.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end = date_value.replace(month=date_value.month + 1, day=1) - timedelta(days=1)
    return make_statistics(db, start, end)
