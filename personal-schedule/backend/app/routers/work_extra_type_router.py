from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.work_extra_type import WorkExtraTypeCreate, WorkExtraTypeRead, WorkExtraTypeUpdate
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
def read_work_extra_types(db: Session = Depends(get_db)):
    """List all extra types such as NPC, OT, EXTEND, sorted by code."""
    return get_work_extra_types(db)


@router.post("", response_model=WorkExtraTypeRead)
def create_work_extra_type_endpoint(payload: WorkExtraTypeCreate, db: Session = Depends(get_db)):
    """Create a new extra type used to compute money for a shift."""
    return create_work_extra_type(db, payload)


@router.get("/{extra_type_id}", response_model=WorkExtraTypeRead)
def read_work_extra_type(extra_type_id: int, db: Session = Depends(get_db)):
    """Fetch one extra type by id."""
    extra_type = get_work_extra_type(db, extra_type_id)
    if extra_type is None:
        raise HTTPException(status_code=404, detail="WorkExtraType not found")
    return extra_type


@router.put("/{extra_type_id}", response_model=WorkExtraTypeRead)
def update_work_extra_type_endpoint(extra_type_id: int, payload: WorkExtraTypeUpdate, db: Session = Depends(get_db)):
    """Update an extra type: code, name, unit, rate_type, rate_value, status."""
    extra_type = get_work_extra_type(db, extra_type_id)
    if extra_type is None:
        raise HTTPException(status_code=404, detail="WorkExtraType not found")
    return update_work_extra_type(db, extra_type, payload)


@router.delete("/{extra_type_id}")
def delete_work_extra_type_endpoint(extra_type_id: int, db: Session = Depends(get_db)):
    """Delete an extra type."""
    extra_type = get_work_extra_type(db, extra_type_id)
    if extra_type is None:
        raise HTTPException(status_code=404, detail="WorkExtraType not found")
    delete_work_extra_type(db, extra_type)
    return {"detail": "WorkExtraType deleted"}
