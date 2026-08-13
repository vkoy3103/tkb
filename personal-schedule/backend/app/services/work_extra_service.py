from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.work_extra import WorkExtra
from app.models.work_shift import WorkShift
from app.schemas.work_extra import WorkExtraCreate, WorkExtraUpdate
from app.services.settings_service import get_settings


def get_work_extras(db: Session) -> list[WorkExtra]:
    return db.query(WorkExtra).order_by(WorkExtra.created_at).all()


def get_work_extra(db: Session, work_extra_id: int) -> WorkExtra | None:
    return db.query(WorkExtra).filter(WorkExtra.id == work_extra_id).first()


def validate_work_extra(payload: WorkExtraCreate) -> None:
    if payload.type == "EXTEND":
        if payload.quantity is None or payload.quantity < 0:
            raise HTTPException(status_code=400, detail="EXTEND requires non-negative quantity")
        if payload.hours not in (None, 0):
            raise HTTPException(status_code=400, detail="EXTEND does not use hours")
    else:
        if payload.hours is None or payload.hours < 0:
            raise HTTPException(status_code=400, detail=f"{payload.type} requires non-negative hours")
        if payload.quantity not in (None, 0):
            raise HTTPException(status_code=400, detail=f"{payload.type} does not use quantity")


def calculate_amount(payload: WorkExtraCreate) -> int:
    settings = get_settings()
    if payload.type == "NPC":
        return int((payload.hours or 0) * settings.npc_rate)
    if payload.type == "OT":
        return int((payload.hours or 0) * settings.ot_rate)
    if payload.type == "EXTEND":
        return int((payload.quantity or 0) * settings.extend_rate)
    return 0


def create_work_extra(db: Session, payload: WorkExtraCreate) -> WorkExtra:
    if not db.query(WorkShift).filter(WorkShift.id == payload.work_shift_id).first():
        raise HTTPException(status_code=404, detail="WorkShift not found")
    validate_work_extra(payload)
    amount = calculate_amount(payload)
    if amount < 0:
        raise HTTPException(status_code=400, detail="Calculated amount must not be negative")
    work_extra = WorkExtra(**payload.model_dump(), amount=amount)
    db.add(work_extra)
    db.commit()
    db.refresh(work_extra)
    return work_extra


def update_work_extra(db: Session, work_extra: WorkExtra, payload: WorkExtraUpdate) -> WorkExtra:
    if not db.query(WorkShift).filter(WorkShift.id == payload.work_shift_id).first():
        raise HTTPException(status_code=404, detail="WorkShift not found")
    validate_work_extra(payload)
    amount = calculate_amount(payload)
    if amount < 0:
        raise HTTPException(status_code=400, detail="Calculated amount must not be negative")
    for field, value in payload.model_dump().items():
        setattr(work_extra, field, value)
    work_extra.amount = amount
    db.commit()
    db.refresh(work_extra)
    return work_extra


def delete_work_extra(db: Session, work_extra: WorkExtra) -> None:
    db.delete(work_extra)
    db.commit()
