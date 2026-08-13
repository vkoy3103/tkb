from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.statistics_service import day_statistics, month_statistics, week_statistics

router = APIRouter(prefix="/statistics", tags=["statistics"])


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("/day")
def read_day_statistics(date_value: date = Query(..., alias="date"), db: Session = Depends(get_db)):
    return day_statistics(db, date_value)


@router.get("/week")
def read_week_statistics(date_value: date = Query(..., alias="date"), db: Session = Depends(get_db)):
    return week_statistics(db, date_value)


@router.get("/month")
def read_month_statistics(date_value: date = Query(..., alias="date"), db: Session = Depends(get_db)):
    return month_statistics(db, date_value)
