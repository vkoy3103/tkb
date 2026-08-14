from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.period import Period
from app.models.schedule import Schedule
from app.models.work_extra import WorkExtra
from app.models.work_shift import WorkShift
from app.services.settings_service import get_settings


def get_settings_map() -> dict[str, float]:
    settings = get_settings()
    values = {}
    for setting in settings:
        key = setting.key.upper()
        try:
            values[key] = float(setting.value or 0)
        except (TypeError, ValueError):
            values[key] = 0.0
    return values


def calculate_work_shift_normal_hours(shift: WorkShift) -> float:
    if shift.actual_start is None or shift.actual_end is None:
        return 0.0
    start = datetime.combine(shift.date, shift.actual_start)
    scheduled_end = datetime.combine(shift.date, shift.scheduled_end)
    actual_end = datetime.combine(shift.date, shift.actual_end)
    normal_end = min(actual_end, scheduled_end)
    return max(0.0, (normal_end - start).total_seconds() / 3600.0)


def calculate_work_shift_ot_hours(shift: WorkShift) -> float:
    if shift.actual_end is None:
        return 0.0
    scheduled_end = datetime.combine(shift.date, shift.scheduled_end)
    actual_end = datetime.combine(shift.date, shift.actual_end)
    if actual_end <= scheduled_end:
        return 0.0
    return max(0.0, (actual_end - scheduled_end).total_seconds() / 3600.0)


def get_shifts_in_range(db: Session, start_date: date, end_date: date) -> list[WorkShift]:
    return db.query(WorkShift).filter(WorkShift.date >= start_date, WorkShift.date <= end_date).all()


def get_extras_in_range(db: Session, start_date: date, end_date: date) -> list[WorkExtra]:
    return db.query(WorkExtra).join(WorkShift).filter(WorkShift.date >= start_date, WorkShift.date <= end_date).all()


def get_period_map(db: Session) -> dict[int, Period]:
    return {period.period_number: period for period in db.query(Period).all()}


def get_study_hours(db: Session, start_date: date, end_date: date) -> float:
    schedules = db.query(Schedule).all()
    periods = get_period_map(db)
    total = 0.0

    current = start_date
    while current <= end_date:
        for schedule in schedules:
            if current.weekday() + 2 != schedule.weekday:
                continue
            start_period = periods.get(schedule.start_period)
            end_period = periods.get(schedule.end_period)
            if start_period is None or end_period is None:
                continue
            duration = (datetime.combine(current, end_period.end_time) - datetime.combine(current, start_period.start_time)).total_seconds() / 3600.0
            total += max(0.0, duration)
        current += timedelta(days=1)

    return total


def make_statistics(db: Session, start_date: date, end_date: date) -> dict:
    settings = get_settings_map()
    shifts = get_shifts_in_range(db, start_date, end_date)
    extras = get_extras_in_range(db, start_date, end_date)
    study_hours = get_study_hours(db, start_date, end_date)

    normal_hours = sum(calculate_work_shift_normal_hours(shift) for shift in shifts)
    ot_hours = sum(calculate_work_shift_ot_hours(shift) for shift in shifts)

    npc_hours = 0.0
    extend_count = 0
    for extra in extras:
        if extra.extra_type is None:
            continue
        if extra.extra_type.code.upper() == "NPC":
            npc_hours += float(extra.quantity or 0)
        if extra.extra_type.code.upper() == "EXTEND":
            extend_count += int(extra.quantity or 0)

    normal_income = int(round(normal_hours * settings.get("NORMAL_RATE", 0.0)))
    ot_income = int(round(ot_hours * settings.get("OT_RATE", 0.0)))
    npc_income = int(round(npc_hours * settings.get("NPC_RATE", 0.0)))
    extend_income = int(round(extend_count * settings.get("EXTEND_RATE", 0.0)))

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
