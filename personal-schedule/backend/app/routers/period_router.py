from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.period import PeriodCreate, PeriodRead, PeriodUpdate
from app.services.auth_service import get_current_user
from app.services.period_service import (
    create_period,
    delete_period,
    get_period,
    get_period_by_number,
    get_periods,
    update_period,
)

router = APIRouter(prefix="/periods", tags=["periods"])


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("", response_model=list[PeriodRead])
def read_periods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all timetable periods ordered by period number."""
    return get_periods(db)


@router.post("", response_model=PeriodRead, status_code=201)
def add_period(
    payload: PeriodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new timetable period (time slot)."""
    if get_period_by_number(db, payload.period_number):
        raise HTTPException(status_code=400, detail=f"Đã tồn tại tiết {payload.period_number}.")
    return create_period(db, payload)


@router.put("/{period_id}", response_model=PeriodRead)
def edit_period(
    period_id: int,
    payload: PeriodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a timetable period."""
    period = get_period(db, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học.")
    existing = get_period_by_number(db, payload.period_number)
    if existing and existing.id != period.id:
        raise HTTPException(status_code=400, detail=f"Đã tồn tại tiết {payload.period_number}.")
    return update_period(db, period, payload)


@router.delete("/{period_id}", status_code=204)
def remove_period(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a timetable period."""
    period = get_period(db, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học.")
    delete_period(db, period)

