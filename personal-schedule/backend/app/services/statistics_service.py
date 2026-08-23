from datetime import date, datetime, time as dt_time, timedelta

from sqlalchemy.orm import Session

from app.models.period import Period
from app.models.schedule import Schedule
from app.models.work_extra import WorkExtra
from app.models.work_shift import WorkShift
from app.services.settings_service import get_rates, get_settings


def get_ot_start_time(user_id: int) -> dt_time:
    """Giờ bắt đầu tính OT (mặc định 22:00), đọc từ setting OT_START_TIME."""
    settings = get_settings(user_id)
    for setting in settings:
        if setting.key.upper() == "OT_START_TIME" and setting.value:
            try:
                return dt_time.fromisoformat(setting.value[:5])
            except ValueError:
                break
    return dt_time(22, 0)


def calculate_work_shift_normal_hours(shift: WorkShift) -> float:
    """Giờ ca thường. Nếu chưa chấm công (actual) thì tính theo giờ dự kiến.
    Ca bị hủy (cancelled) không tính."""
    if shift.status == "cancelled":
        return 0.0
    start = datetime.combine(shift.date, shift.actual_start or shift.scheduled_start)
    scheduled_end = datetime.combine(shift.date, shift.scheduled_end)
    actual_end = datetime.combine(shift.date, shift.actual_end or shift.scheduled_end)
    normal_end = min(actual_end, scheduled_end)
    return max(0.0, (normal_end - start).total_seconds() / 3600.0)


def calculate_work_shift_ot_hours(shift: WorkShift, ot_start: dt_time) -> float:
    """OT chỉ tính từ max(scheduled_end, OT_START_TIME) đến actual_end."""
    if shift.status == "cancelled":
        return 0.0
    scheduled_end = datetime.combine(shift.date, shift.scheduled_end)
    ot_start_dt = datetime.combine(shift.date, ot_start)
    actual_end = datetime.combine(shift.date, shift.actual_end or shift.scheduled_end)
    start = max(scheduled_end, ot_start_dt)
    if actual_end <= start:
        return 0.0
    return max(0.0, (actual_end - start).total_seconds() / 3600.0)


def get_shifts_in_range(db: Session, user_id: int, start_date: date, end_date: date) -> list[WorkShift]:
    return (
        db.query(WorkShift)
        .filter(WorkShift.user_id == user_id, WorkShift.date >= start_date, WorkShift.date <= end_date)
        .all()
    )


def get_extras_in_range(db: Session, user_id: int, start_date: date, end_date: date) -> list[WorkExtra]:
    return (
        db.query(WorkExtra)
        .join(WorkShift)
        .filter(WorkShift.user_id == user_id, WorkShift.date >= start_date, WorkShift.date <= end_date)
        .all()
    )


def get_period_map(db: Session) -> dict[int, Period]:
    return {period.period_number: period for period in db.query(Period).all()}


def get_study_hours(db: Session, user_id: int, start_date: date, end_date: date) -> float:
    schedules = db.query(Schedule).filter(Schedule.user_id == user_id).all()
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


def make_statistics(db: Session, user_id: int, start_date: date, end_date: date) -> dict:
    settings = get_rates(user_id)
    shifts = get_shifts_in_range(db, user_id, start_date, end_date)
    extras = get_extras_in_range(db, user_id, start_date, end_date)
    study_hours = get_study_hours(db, user_id, start_date, end_date)

    normal_hours = sum(calculate_work_shift_normal_hours(shift) for shift in shifts)
    ot_start = get_ot_start_time(user_id)
    ot_hours = sum(calculate_work_shift_ot_hours(shift, ot_start) for shift in shifts)

    npc_hours = 0.0
    extend_count = 0
    for extra in extras:
        if extra.extra_type is None:
            continue
        code = extra.extra_type.code.upper()
        if code == "NPC":
            npc_hours += float(extra.quantity or 0)
        elif code == "OT":
            ot_hours += float(extra.quantity or 0)
        elif code == "EXTEND":
            extend_count += int(extra.quantity or 0)

    normal_rate = settings.get("NORMAL_RATE", 0.0)
    # OT = x2 lương ca thường — get_rates() đã tính OT_RATE = 2 x NORMAL_RATE
    ot_rate = settings.get("OT_RATE", 0.0)
    normal_income = int(round(normal_hours * normal_rate))
    ot_income = int(round(ot_hours * ot_rate))
    npc_income = int(round(npc_hours * settings.get("NPC_RATE", 0.0)))
    extend_income = int(round(extend_count * settings.get("EXTEND_RATE", 0.0)))

    return {
        "study_hours": round(study_hours, 2),
        # Giờ làm = chỉ ca thường (ca làm); NPC/OT/EXTEND là phụ thu/làm thêm trong ca, KHÔNG cộng vào giờ làm
        "work_hours": round(normal_hours, 2),
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


def day_statistics(db: Session, user_id: int, date_value: date) -> dict:
    return make_statistics(db, user_id, date_value, date_value)


def week_statistics(db: Session, user_id: int, date_value: date) -> dict:
    start = date_value - timedelta(days=date_value.weekday())
    end = start + timedelta(days=6)
    return make_statistics(db, user_id, start, end)


def month_statistics(db: Session, user_id: int, date_value: date) -> dict:
    start = date_value.replace(day=1)
    if date_value.month == 12:
        end = date_value.replace(year=date_value.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end = date_value.replace(month=date_value.month + 1, day=1) - timedelta(days=1)
    return make_statistics(db, user_id, start, end)
