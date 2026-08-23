from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.work_extra import WorkExtraCreate, WorkExtraRead, WorkExtraUpdate
from app.services.auth_service import get_current_user
from app.services.work_extra_service import create_work_extra, delete_work_extra, get_work_extra, get_work_extras, update_work_extra

router = APIRouter(prefix="/work-extras", tags=["work-extras"])


def get_db():
    with SessionLocal() as db:
        yield db


# ----- Work extra management -----

@router.get("", response_model=list[WorkExtraRead])
def read_work_extras(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all work extra entries, sorted by creation time."""
    return get_work_extras(db, current_user.id)


@router.post("", response_model=WorkExtraRead)
def create_work_extra_endpoint(
    payload: WorkExtraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a work extra entry for a shift, such as NPC, OT, or EXTEND."""
    return create_work_extra(db, current_user.id, payload)


@router.get("/{work_extra_id}", response_model=WorkExtraRead)
def read_work_extra(
    work_extra_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch one extra payment or extra record by id."""
    work_extra = get_work_extra(db, current_user.id, work_extra_id)
    if work_extra is None:
        raise HTTPException(status_code=404, detail="WorkExtra not found")
    return work_extra


@router.put("/{work_extra_id}", response_model=WorkExtraRead)
def update_work_extra_endpoint(
    work_extra_id: int,
    payload: WorkExtraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update extra details and recalculate the amount automatically."""
    work_extra = get_work_extra(db, current_user.id, work_extra_id)
    if work_extra is None:
        raise HTTPException(status_code=404, detail="WorkExtra not found")
    return update_work_extra(db, current_user.id, work_extra, payload)


@router.delete("/{work_extra_id}")
def delete_work_extra_endpoint(
    work_extra_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a work extra entry."""
    work_extra = get_work_extra(db, current_user.id, work_extra_id)
    if work_extra is None:
        raise HTTPException(status_code=404, detail="WorkExtra not found")
    delete_work_extra(db, work_extra)
    return {"detail": "WorkExtra deleted"}
