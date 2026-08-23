from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.schedule import Schedule
from app.models.subject import Subject
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate


def get_schedules(db: Session, user_id: int) -> list[Schedule]:
    return (
        db.query(Schedule)
        .filter(Schedule.user_id == user_id)
        .order_by(Schedule.weekday, Schedule.start_period, Schedule.start_time)
        .all()
    )


def get_schedule(db: Session, user_id: int, schedule_id: int) -> Schedule | None:
    return (
        db.query(Schedule)
        .filter(Schedule.id == schedule_id, Schedule.user_id == user_id)
        .first()
    )


def _normalize_time_fields(data: dict) -> dict:
    """Khi dùng chế độ giờ, đặt tiết = NULL và ngược lại, để tránh lưu thừa 1 chế độ."""
    data = dict(data)
    has_period = data.get("start_period") is not None or data.get("end_period") is not None
    has_time = data.get("start_time") is not None or data.get("end_time") is not None
    if has_time:
        data["start_period"] = None
        data["end_period"] = None
    elif has_period:
        data["start_time"] = None
        data["end_time"] = None
    return data


def create_schedule(db: Session, user_id: int, payload: ScheduleCreate) -> Schedule:
    if not db.query(Subject).filter(Subject.id == payload.subject_id, Subject.user_id == user_id).first():
        raise HTTPException(status_code=404, detail="Subject not found")
    data = _normalize_time_fields(payload.model_dump())
    schedule = Schedule(user_id=user_id, **data)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def update_schedule(db: Session, schedule: Schedule, payload: ScheduleUpdate) -> Schedule:
    update_data = payload.model_dump(exclude_unset=True)
    if "subject_id" in update_data and update_data["subject_id"] is not None:
        if not db.query(Subject).filter(Subject.id == update_data["subject_id"], Subject.user_id == schedule.user_id).first():
            raise HTTPException(status_code=404, detail="Subject not found")
    update_data = _normalize_time_fields(update_data)
    for field, value in update_data.items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    return schedule


def delete_schedule(db: Session, schedule: Schedule) -> None:
    db.delete(schedule)
    db.commit()
