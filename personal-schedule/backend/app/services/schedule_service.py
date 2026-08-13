from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.schedule import Schedule
from app.models.subject import Subject
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate


def get_schedules(db: Session) -> list[Schedule]:
    return db.query(Schedule).order_by(Schedule.weekday, Schedule.start_period).all()


def get_schedule(db: Session, schedule_id: int) -> Schedule | None:
    return db.query(Schedule).filter(Schedule.id == schedule_id).first()


def validate_schedule_periods(start_period: int, end_period: int) -> None:
    if start_period <= 0 or end_period <= 0:
        raise HTTPException(status_code=400, detail="Period numbers must be positive.")
    if start_period > end_period:
        raise HTTPException(status_code=400, detail="start_period must be less than or equal to end_period")


def create_schedule(db: Session, payload: ScheduleCreate) -> Schedule:
    validate_schedule_periods(payload.start_period, payload.end_period)
    if not db.query(Subject).filter(Subject.id == payload.subject_id).first():
        raise HTTPException(status_code=404, detail="Subject not found")
    schedule = Schedule(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def update_schedule(db: Session, schedule: Schedule, payload: ScheduleUpdate) -> Schedule:
    update_data = payload.model_dump(exclude_unset=True)
    if "start_period" in update_data or "end_period" in update_data:
        start_period = update_data.get("start_period", schedule.start_period)
        end_period = update_data.get("end_period", schedule.end_period)
        validate_schedule_periods(start_period, end_period)
    if "subject_id" in update_data and update_data["subject_id"] is not None:
        if not db.query(Subject).filter(Subject.id == update_data["subject_id"]).first():
            raise HTTPException(status_code=404, detail="Subject not found")
    for field, value in update_data.items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    return schedule


def delete_schedule(db: Session, schedule: Schedule) -> None:
    db.delete(schedule)
    db.commit()
