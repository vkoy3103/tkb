from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.schedule import Schedule
from app.models.schedule_override import ScheduleOverride
from app.schemas.schedule_override import ScheduleOverrideCreate, ScheduleOverrideUpdate


def get_schedule_overrides(db: Session) -> list[ScheduleOverride]:
    return db.query(ScheduleOverride).order_by(ScheduleOverride.date, ScheduleOverride.id).all()


def get_schedule_override(db: Session, override_id: int) -> ScheduleOverride | None:
    return db.query(ScheduleOverride).filter(ScheduleOverride.id == override_id).first()


def validate_override_type(override_type: str) -> None:
    allowed = {"cancel", "make_up", "reschedule"}
    if override_type not in allowed:
        raise HTTPException(status_code=400, detail="type must be one of: cancel, make_up, reschedule")


def validate_override_periods(start_period: int | None, end_period: int | None) -> None:
    if start_period is None and end_period is None:
        return
    if start_period is None or end_period is None:
        raise HTTPException(status_code=400, detail="new_start_period and new_end_period must be provided together")
    if start_period <= 0 or end_period <= 0:
        raise HTTPException(status_code=400, detail="Period numbers must be positive.")
    if start_period > end_period:
        raise HTTPException(status_code=400, detail="new_start_period must be less than or equal to new_end_period")


def create_schedule_override(db: Session, payload: ScheduleOverrideCreate) -> ScheduleOverride:
    validate_override_type(payload.type)
    validate_override_periods(payload.new_start_period, payload.new_end_period)

    schedule = db.query(Schedule).filter(Schedule.id == payload.class_schedule_id).first()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")

    override = ScheduleOverride(**payload.model_dump())
    db.add(override)
    db.commit()
    db.refresh(override)
    return override


def update_schedule_override(db: Session, override: ScheduleOverride, payload: ScheduleOverrideUpdate) -> ScheduleOverride:
    update_data = payload.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"] is not None:
        validate_override_type(update_data["type"])
    if ("new_start_period" in update_data or "new_end_period" in update_data):
        start_period = update_data.get("new_start_period", override.new_start_period)
        end_period = update_data.get("new_end_period", override.new_end_period)
        validate_override_periods(start_period, end_period)
    if "class_schedule_id" in update_data and update_data["class_schedule_id"] is not None:
        schedule = db.query(Schedule).filter(Schedule.id == update_data["class_schedule_id"]).first()
        if schedule is None:
            raise HTTPException(status_code=404, detail="Schedule not found")

    for field, value in update_data.items():
        setattr(override, field, value)

    db.commit()
    db.refresh(override)
    return override


def delete_schedule_override(db: Session, override: ScheduleOverride) -> None:
    db.delete(override)
    db.commit()
