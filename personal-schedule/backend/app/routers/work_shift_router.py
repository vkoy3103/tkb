from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.work_shift import (
    WorkShiftCreate,
    WorkShiftExtrasUpdate,
    WorkShiftRead,
    WorkShiftUpdate,
)
from app.services.work_shift_service import (
    create_work_shift,
    delete_work_shift,
    get_work_shift,
    get_work_shifts,
    sync_work_shift_extras,
    update_work_shift,
)

router = APIRouter(prefix="/work-shifts", tags=["work-shifts"])


def get_db():
    with SessionLocal() as db:
        yield db


# ----- Work shift management -----

@router.get("", response_model=list[WorkShiftRead])
def read_work_shifts(db: Session = Depends(get_db)):
    """Get all work shifts sorted by date and scheduled start time."""
    return get_work_shifts(db)


@router.post("", response_model=WorkShiftRead)
def create_work_shift_endpoint(payload: WorkShiftCreate, db: Session = Depends(get_db)):
    """Create a new work shift with scheduled and actual time information."""
    return create_work_shift(db, payload)


@router.get("/{work_shift_id}", response_model=WorkShiftRead)
def read_work_shift(work_shift_id: int, db: Session = Depends(get_db)):
    """Fetch one work shift by id."""
    work_shift = get_work_shift(db, work_shift_id)
    if work_shift is None:
        raise HTTPException(status_code=404, detail="WorkShift not found")
    return work_shift


@router.put("/{work_shift_id}", response_model=WorkShiftRead)
def update_work_shift_endpoint(work_shift_id: int, payload: WorkShiftUpdate, db: Session = Depends(get_db)):
    """Update work shift details, including scheduled time, actual time, and status."""
    work_shift = get_work_shift(db, work_shift_id)
    if work_shift is None:
        raise HTTPException(status_code=404, detail="WorkShift not found")
    return update_work_shift(db, work_shift, payload)


@router.delete("/{work_shift_id}")
def delete_work_shift_endpoint(work_shift_id: int, db: Session = Depends(get_db)):
    """Delete a work shift and any related records."""
    work_shift = get_work_shift(db, work_shift_id)
    if work_shift is None:
        raise HTTPException(status_code=404, detail="WorkShift not found")
    delete_work_shift(db, work_shift)
    return {"detail": "WorkShift deleted"}


@router.put("/{work_shift_id}/extras", response_model=WorkShiftRead)
def update_work_shift_extras(
    work_shift_id: int, payload: WorkShiftExtrasUpdate, db: Session = Depends(get_db)
):
    """Đồng bộ trạng thái + số giờ NPC/OT + số lần EXTEND của ca trong 1 transaction (upsert)."""
    work_shift = get_work_shift(db, work_shift_id)
    if work_shift is None:
        raise HTTPException(status_code=404, detail="WorkShift not found")
    sync_work_shift_extras(
        db,
        work_shift,
        status=payload.status,
        quantities={
            "NPC": payload.npc_hours if payload.npc_hours is not None else 0.0,
            "OT": payload.ot_hours if payload.ot_hours is not None else 0.0,
            "EXTEND": payload.extend_count if payload.extend_count is not None else 0.0,
        },
    )
    return work_shift
