from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.work_extra import WorkExtraCreate, WorkExtraRead, WorkExtraUpdate
from app.services.work_extra_service import create_work_extra, delete_work_extra, get_work_extra, get_work_extras, update_work_extra

router = APIRouter()


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("/work-extras", response_model=list[WorkExtraRead])
def read_work_extras(db: Session = Depends(get_db)):
    return get_work_extras(db)


@router.post("/work-extras", response_model=WorkExtraRead)
def create_work_extra_endpoint(payload: WorkExtraCreate, db: Session = Depends(get_db)):
    return create_work_extra(db, payload)


@router.get("/work-extras/{work_extra_id}", response_model=WorkExtraRead)
def read_work_extra(work_extra_id: int, db: Session = Depends(get_db)):
    work_extra = get_work_extra(db, work_extra_id)
    if work_extra is None:
        raise HTTPException(status_code=404, detail="WorkExtra not found")
    return work_extra


@router.put("/work-extras/{work_extra_id}", response_model=WorkExtraRead)
def update_work_extra_endpoint(work_extra_id: int, payload: WorkExtraUpdate, db: Session = Depends(get_db)):
    work_extra = get_work_extra(db, work_extra_id)
    if work_extra is None:
        raise HTTPException(status_code=404, detail="WorkExtra not found")
    return update_work_extra(db, work_extra, payload)


@router.delete("/work-extras/{work_extra_id}")
def delete_work_extra_endpoint(work_extra_id: int, db: Session = Depends(get_db)):
    work_extra = get_work_extra(db, work_extra_id)
    if work_extra is None:
        raise HTTPException(status_code=404, detail="WorkExtra not found")
    delete_work_extra(db, work_extra)
    return {"detail": "WorkExtra deleted"}
