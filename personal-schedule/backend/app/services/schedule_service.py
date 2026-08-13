from datetime import time
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.schedule import Schedule
from app.models.subject import Subject
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate


def get_schedules(db: Session) -> list[Schedule]:
    return db.query(Schedule).order_by(Schedule.date, Schedule.start_time).all()


def get_schedule(db: Session, schedule_id: int) -> Schedule | None:
    return db.query(Schedule).filter(Schedule.id == schedule_id).first()


def validate_schedule_times(start_time: time, end_time: time) -> None:
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")


def create_schedule(db: Session, payload: ScheduleCreate) -> Schedule:
    validate_schedule_times(payload.start_time, payload.end_time)
    if not db.query(Subject).filter(Subject.id == payload.subject_id).first():
        raise HTTPException(status_code=404, detail="Subject not found")
    schedule = Schedule(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def update_schedule(db: Session, schedule: Schedule, payload: ScheduleUpdate) -> Schedule:
    validate_schedule_times(payload.start_time, payload.end_time)
    if not db.query(Subject).filter(Subject.id == payload.subject_id).first():
        raise HTTPException(status_code=404, detail="Subject not found")
    for field, value in payload.model_dump().items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    return schedule


def delete_schedule(db: Session, schedule: Schedule) -> None:
    db.delete(schedule)
    db.commit()
