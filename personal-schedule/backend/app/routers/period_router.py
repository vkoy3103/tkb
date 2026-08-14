from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.period import Period
from app.schemas.period import PeriodRead
from app.services.period_service import get_periods

router = APIRouter(prefix="/periods", tags=["periods"])


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("", response_model=list[PeriodRead])
def read_periods(db: Session = Depends(get_db)):
    """Get all timetable periods ordered by period number."""
    return get_periods(db)
