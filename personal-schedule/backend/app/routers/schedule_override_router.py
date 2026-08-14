from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.schedule_override import ScheduleOverrideCreate, ScheduleOverrideRead, ScheduleOverrideUpdate
from app.services.schedule_override_service import (
    create_schedule_override,
    delete_schedule_override,
    get_schedule_override,
    get_schedule_overrides,
    update_schedule_override,
)

router = APIRouter(prefix="/schedule-overrides", tags=["schedule-overrides"])


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("", response_model=list[ScheduleOverrideRead])
def read_schedule_overrides(db: Session = Depends(get_db)):
    """Get all schedule override records such as cancelled or makeup classes."""
    return get_schedule_overrides(db)


@router.post("", response_model=ScheduleOverrideRead)
def create_schedule_override_endpoint(payload: ScheduleOverrideCreate, db: Session = Depends(get_db)):
    """Create a schedule override for a specific class schedule."""
    return create_schedule_override(db, payload)


@router.get("/{override_id}", response_model=ScheduleOverrideRead)
def read_schedule_override(override_id: int, db: Session = Depends(get_db)):
    """Fetch one schedule override by id."""
    override = get_schedule_override(db, override_id)
    if override is None:
        raise HTTPException(status_code=404, detail="Schedule override not found")
    return override


@router.put("/{override_id}", response_model=ScheduleOverrideRead)
def update_schedule_override_endpoint(override_id: int, payload: ScheduleOverrideUpdate, db: Session = Depends(get_db)):
    """Update an existing schedule override."""
    override = get_schedule_override(db, override_id)
    if override is None:
        raise HTTPException(status_code=404, detail="Schedule override not found")
    return update_schedule_override(db, override, payload)


@router.delete("/{override_id}")
def delete_schedule_override_endpoint(override_id: int, db: Session = Depends(get_db)):
    """Delete a schedule override."""
    override = get_schedule_override(db, override_id)
    if override is None:
        raise HTTPException(status_code=404, detail="Schedule override not found")
    delete_schedule_override(db, override)
    return {"detail": "Schedule override deleted"}
