from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.services.schedule_service import create_schedule, delete_schedule, get_schedule, get_schedules, update_schedule

router = APIRouter()


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("/schedules", response_model=list[ScheduleRead])
def read_schedules(db: Session = Depends(get_db)):
    return get_schedules(db)


@router.post("/schedules", response_model=ScheduleRead)
def create_schedule_endpoint(payload: ScheduleCreate, db: Session = Depends(get_db)):
    return create_schedule(db, payload)


@router.get("/schedules/{schedule_id}", response_model=ScheduleRead)
def read_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = get_schedule(db, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/schedules/{schedule_id}", response_model=ScheduleRead)
def update_schedule_endpoint(schedule_id: int, payload: ScheduleUpdate, db: Session = Depends(get_db)):
    schedule = get_schedule(db, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return update_schedule(db, schedule, payload)


@router.delete("/schedules/{schedule_id}")
def delete_schedule_endpoint(schedule_id: int, db: Session = Depends(get_db)):
    schedule = get_schedule(db, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    delete_schedule(db, schedule)
    return {"detail": "Schedule deleted"}
