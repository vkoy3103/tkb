from sqlalchemy.orm import Session

from app.models.period import Period


def get_periods(db: Session) -> list[Period]:
    return db.query(Period).order_by(Period.period_number).all()
