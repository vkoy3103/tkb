from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.services.auth_service import get_current_user
from app.services.schedule_service import (
    create_schedule,
    create_schedules_bulk,
    delete_schedule,
    get_schedule,
    get_schedules,
    update_schedule,
)

router = APIRouter(prefix="/schedules", tags=["schedules"])


def get_db():
    with SessionLocal() as db:
        yield db


# ----- Class schedule management -----

@router.get("", response_model=list[ScheduleRead])
def read_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all class schedules sorted by weekday and start period."""
    return get_schedules(db, current_user.id)


@router.post("", response_model=ScheduleRead)
def create_schedule_endpoint(
    payload: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a class schedule mapping a subject to a weekday, time range, room, and week range."""
    return create_schedule(db, current_user.id, payload)


@router.post("/bulk", response_model=list[ScheduleRead])
def create_schedules_bulk_endpoint(
    payloads: list[ScheduleCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo nhiều lịch học trong 1 request (import hàng loạt — nhanh hơn gọi từng lịch)."""
    return create_schedules_bulk(db, current_user.id, payloads)


@router.get("/{schedule_id}", response_model=ScheduleRead)
def read_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch one class schedule by its id."""
    schedule = get_schedule(db, current_user.id, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleRead)
def update_schedule_endpoint(
    schedule_id: int,
    payload: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a class schedule with a new subject, weekday, room, or period range."""
    schedule = get_schedule(db, current_user.id, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return update_schedule(db, schedule, payload)


@router.delete("/{schedule_id}")
def delete_schedule_endpoint(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a class schedule definition."""
    schedule = get_schedule(db, current_user.id, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    delete_schedule(db, schedule)
    return {"detail": "Schedule deleted"}
