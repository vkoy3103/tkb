from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.other_income import OtherIncomeCreate, OtherIncomeRead, OtherIncomeUpdate
from app.services.auth_service import get_current_user
from app.services.other_income_service import (
    create_other_income,
    delete_other_income,
    get_other_income,
    get_other_incomes,
    update_other_income,
)

router = APIRouter(prefix="/other-incomes", tags=["other-incomes"])


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("", response_model=list[OtherIncomeRead])
def read_other_incomes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sách các khoản thu nhập khác của user (thưởng, phụ cấp...)."""
    return get_other_incomes(db, current_user.id)


@router.post("", response_model=OtherIncomeRead)
def create_other_income_endpoint(
    payload: OtherIncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thêm một khoản thu nhập khác do người dùng tự nhập."""
    return create_other_income(db, current_user.id, payload)


@router.get("/{other_income_id}", response_model=OtherIncomeRead)
def read_other_income(
    other_income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = get_other_income(db, current_user.id, other_income_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="OtherIncome not found")
    return obj


@router.put("/{other_income_id}", response_model=OtherIncomeRead)
def update_other_income_endpoint(
    other_income_id: int,
    payload: OtherIncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = get_other_income(db, current_user.id, other_income_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="OtherIncome not found")
    return update_other_income(db, obj, payload)


@router.delete("/{other_income_id}")
def delete_other_income_endpoint(
    other_income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = get_other_income(db, current_user.id, other_income_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="OtherIncome not found")
    delete_other_income(db, obj)
    return {"detail": "OtherIncome deleted"}
