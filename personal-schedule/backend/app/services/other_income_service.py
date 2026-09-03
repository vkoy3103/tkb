from sqlalchemy.orm import Session

from app.models.other_income import OtherIncome
from app.schemas.other_income import OtherIncomeCreate, OtherIncomeUpdate


def get_other_incomes(db: Session, user_id: int) -> list[OtherIncome]:
    """Danh sách thu nhập khác của user, sắp theo ngày mới nhất rồi thời điểm tạo."""
    return (
        db.query(OtherIncome)
        .filter(OtherIncome.user_id == user_id)
        .order_by(OtherIncome.date.desc(), OtherIncome.created_at.desc())
        .all()
    )


def get_other_income(db: Session, user_id: int, other_income_id: int) -> OtherIncome | None:
    return (
        db.query(OtherIncome)
        .filter(OtherIncome.id == other_income_id, OtherIncome.user_id == user_id)
        .first()
    )


def create_other_income(db: Session, user_id: int, payload: OtherIncomeCreate) -> OtherIncome:
    obj = OtherIncome(user_id=user_id, **payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_other_income(db: Session, obj: OtherIncome, payload: OtherIncomeUpdate) -> OtherIncome:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_other_income(db: Session, obj: OtherIncome) -> None:
    db.delete(obj)
    db.commit()
