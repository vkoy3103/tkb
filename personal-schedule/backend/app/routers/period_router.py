from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.period import PeriodRead
from app.services.auth_service import get_current_user
from app.services.period_service import get_periods

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
