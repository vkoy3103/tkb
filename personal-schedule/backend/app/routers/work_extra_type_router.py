from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.work_extra_type import WorkExtraTypeCreate, WorkExtraTypeRead, WorkExtraTypeUpdate
from app.services.auth_service import get_current_user
from app.services.work_extra_type_service import (
    create_work_extra_type,
    delete_work_extra_type,
    get_work_extra_type,
    get_work_extra_types,
    update_work_extra_type,
)

router = APIRouter(prefix="/work-extra-types", tags=["work-extra-types"])


def get_db():
    with SessionLocal() as db:
        yield db


# ----- Work extra type management (NPC / OT / EXTEND ...) -----

@router.get("", response_model=list[WorkExtraTypeRead])
def read_work_extra_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all extra types such as NPC, OT, EXTEND, sorted by code."""
    return get_work_extra_types(db, current_user.id)


@router.post("", response_model=WorkExtraTypeRead)
def create_work_extra_type_endpoint(
    payload: WorkExtraTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new extra type used to compute money for a shift."""
    return create_work_extra_type(db, current_user.id, payload)


@router.get("/{extra_type_id}", response_model=WorkExtraTypeRead)
def read_work_extra_type(
    extra_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch one extra type by id."""
    extra_type = get_work_extra_type(db, current_user.id, extra_type_id)
    if extra_type is None:
        raise HTTPException(status_code=404, detail="WorkExtraType not found")
    return extra_type


@router.put("/{extra_type_id}", response_model=WorkExtraTypeRead)
def update_work_extra_type_endpoint(
    extra_type_id: int,
    payload: WorkExtraTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an extra type: code, name, unit, rate_type, rate_value, status."""
    extra_type = get_work_extra_type(db, current_user.id, extra_type_id)
    if extra_type is None:
        raise HTTPException(status_code=404, detail="WorkExtraType not found")
    return update_work_extra_type(db, extra_type, payload)


@router.delete("/{extra_type_id}")
def delete_work_extra_type_endpoint(
    extra_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an extra type."""
    extra_type = get_work_extra_type(db, current_user.id, extra_type_id)
    if extra_type is None:
        raise HTTPException(status_code=404, detail="WorkExtraType not found")
    delete_work_extra_type(db, extra_type)
    return {"detail": "WorkExtraType deleted"}
