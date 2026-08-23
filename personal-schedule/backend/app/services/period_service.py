from sqlalchemy.orm import Session

from app.models.period import Period
from app.schemas.period import PeriodCreate, PeriodUpdate


def get_periods(db: Session) -> list[Period]:
    return db.query(Period).order_by(Period.period_number).all()


def get_period(db: Session, period_id: int) -> Period | None:
    return db.get(Period, period_id)


def get_period_by_number(db: Session, period_number: int) -> Period | None:
    return db.query(Period).filter(Period.period_number == period_number).first()


def create_period(db: Session, payload: PeriodCreate) -> Period:
    period = Period(
        period_number=payload.period_number,
        start_time=payload.start_time,
        end_time=payload.end_time,
        label=payload.label,
        note=payload.note,
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


def update_period(db: Session, period: Period, payload: PeriodUpdate) -> Period:
    period.period_number = payload.period_number
    period.start_time = payload.start_time
    period.end_time = payload.end_time
    period.label = payload.label
    period.note = payload.note
    db.commit()
    db.refresh(period)
    return period


def delete_period(db: Session, period: Period) -> None:
    db.delete(period)
    db.commit()
