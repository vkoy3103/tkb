from datetime import time
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.work_shift import WorkShift
from app.schemas.work_shift import WorkShiftCreate, WorkShiftUpdate

SHIFT_TIMES = {
    1: (time(9, 0), time(13, 0)),
    2: (time(13, 0), time(18, 0)),
    3: (time(18, 0), time(22, 0)),
}


def get_work_shifts(db: Session) -> list[WorkShift]:
    return db.query(WorkShift).order_by(WorkShift.date, WorkShift.shift_number).all()


def get_work_shift(db: Session, work_shift_id: int) -> WorkShift | None:
    return db.query(WorkShift).filter(WorkShift.id == work_shift_id).first()


def validate_actual_times(actual_start: time, actual_end: time) -> None:
    if actual_start >= actual_end:
        raise HTTPException(status_code=400, detail="actual_start must be before actual_end")


def create_work_shift(db: Session, payload: WorkShiftCreate) -> WorkShift:
    if payload.shift_number not in SHIFT_TIMES:
        raise HTTPException(status_code=400, detail="shift_number must be 1, 2, or 3")
    validate_actual_times(payload.actual_start, payload.actual_end)
    scheduled_start, scheduled_end = SHIFT_TIMES[payload.shift_number]
    work_shift = WorkShift(
        date=payload.date,
        shift_number=payload.shift_number,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        actual_start=payload.actual_start,
        actual_end=payload.actual_end,
        note=payload.note,
    )
    db.add(work_shift)
    db.commit()
    db.refresh(work_shift)
    return work_shift


def update_work_shift(db: Session, work_shift: WorkShift, payload: WorkShiftUpdate) -> WorkShift:
    validate_actual_times(payload.actual_start, payload.actual_end)
    if payload.shift_number not in SHIFT_TIMES:
        raise HTTPException(status_code=400, detail="shift_number must be 1, 2, or 3")
    scheduled_start, scheduled_end = SHIFT_TIMES[payload.shift_number]
    work_shift.scheduled_start = scheduled_start
    work_shift.scheduled_end = scheduled_end
    work_shift.actual_start = payload.actual_start
    work_shift.actual_end = payload.actual_end
    work_shift.note = payload.note
    db.commit()
    db.refresh(work_shift)
    return work_shift


def delete_work_shift(db: Session, work_shift: WorkShift) -> None:
    db.delete(work_shift)
    db.commit()
