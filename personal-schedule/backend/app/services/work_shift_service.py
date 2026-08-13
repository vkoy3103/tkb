from datetime import time

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.work_shift import WorkShift
from app.schemas.work_shift import WorkShiftCreate, WorkShiftUpdate


def get_work_shifts(db: Session) -> list[WorkShift]:
    return db.query(WorkShift).order_by(WorkShift.date, WorkShift.scheduled_start).all()


def get_work_shift(db: Session, work_shift_id: int) -> WorkShift | None:
    return db.query(WorkShift).filter(WorkShift.id == work_shift_id).first()


def validate_shift_times(scheduled_start: time, scheduled_end: time, actual_start: time | None, actual_end: time | None) -> None:
    if scheduled_start >= scheduled_end:
        raise HTTPException(status_code=400, detail="scheduled_start must be before scheduled_end")
    if actual_start is not None and actual_end is not None and actual_start >= actual_end:
        raise HTTPException(status_code=400, detail="actual_start must be before actual_end")


def create_work_shift(db: Session, payload: WorkShiftCreate) -> WorkShift:
    validate_shift_times(payload.scheduled_start, payload.scheduled_end, payload.actual_start, payload.actual_end)
    work_shift = WorkShift(**payload.model_dump())
    db.add(work_shift)
    db.commit()
    db.refresh(work_shift)
    return work_shift


def update_work_shift(db: Session, work_shift: WorkShift, payload: WorkShiftUpdate) -> WorkShift:
    update_data = payload.model_dump(exclude_unset=True)
    if "scheduled_start" in update_data or "scheduled_end" in update_data:
        scheduled_start = update_data.get("scheduled_start", work_shift.scheduled_start)
        scheduled_end = update_data.get("scheduled_end", work_shift.scheduled_end)
        actual_start = update_data.get("actual_start", work_shift.actual_start)
        actual_end = update_data.get("actual_end", work_shift.actual_end)
        validate_shift_times(scheduled_start, scheduled_end, actual_start, actual_end)
    elif "actual_start" in update_data or "actual_end" in update_data:
        actual_start = update_data.get("actual_start", work_shift.actual_start)
        actual_end = update_data.get("actual_end", work_shift.actual_end)
        validate_shift_times(work_shift.scheduled_start, work_shift.scheduled_end, actual_start, actual_end)

    for field, value in update_data.items():
        setattr(work_shift, field, value)
    db.commit()
    db.refresh(work_shift)
    return work_shift


def delete_work_shift(db: Session, work_shift: WorkShift) -> None:
    db.delete(work_shift)
    db.commit()
