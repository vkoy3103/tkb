from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.setting import Setting
from app.models.work_extra import WorkExtra
from app.models.work_extra_type import WorkExtraType
from app.models.work_shift import WorkShift
from app.schemas.work_extra import WorkExtraCreate, WorkExtraUpdate


def get_work_extras(db: Session) -> list[WorkExtra]:
    return db.query(WorkExtra).order_by(WorkExtra.created_at).all()


def get_work_extra(db: Session, work_extra_id: int) -> WorkExtra | None:
    return db.query(WorkExtra).filter(WorkExtra.id == work_extra_id).first()


def validate_work_extra(payload: WorkExtraCreate | WorkExtraUpdate) -> None:
    if payload.quantity is not None and payload.quantity < 0:
        raise HTTPException(status_code=400, detail="quantity must be non-negative")
    if payload.unit_price is not None and payload.unit_price < 0:
        raise HTTPException(status_code=400, detail="unit_price must be non-negative")
    if payload.amount is not None and payload.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be non-negative")


def calculate_amount(quantity: int | None, unit_price: float | None, explicit_amount: int | None) -> int:
    if explicit_amount is not None:
        return int(explicit_amount)
    quantity = quantity or 0
    unit_price = unit_price or 0
    return int(quantity * unit_price)


def get_setting_value(db: Session, key: str, default: float = 0.0) -> float:
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting is None or setting.value is None:
        return default
    try:
        return float(setting.value)
    except (TypeError, ValueError):
        return default


def resolve_unit_price(db: Session, extra_type: WorkExtraType, provided: float | None) -> float:
    """Tự tính đơn giá theo loại phụ thu nếu client không truyền:
    - FIXED: đơn giá = rate_value
    - MULTIPLIER: đơn giá = rate_value x NORMAL_RATE
    """
    if provided is not None:
        return provided
    if extra_type.rate_type == "MULTIPLIER":
        normal_rate = get_setting_value(db, "NORMAL_RATE", 0.0)
        return extra_type.rate_value * normal_rate
    return float(extra_type.rate_value)


def get_extra_type_or_404(db: Session, extra_type_id: int) -> WorkExtraType:
    extra_type = db.query(WorkExtraType).filter(WorkExtraType.id == extra_type_id).first()
    if extra_type is None:
        raise HTTPException(status_code=404, detail="WorkExtraType not found")
    return extra_type


def create_work_extra(db: Session, payload: WorkExtraCreate) -> WorkExtra:
    if not db.query(WorkShift).filter(WorkShift.id == payload.work_shift_id).first():
        raise HTTPException(status_code=404, detail="WorkShift not found")
    extra_type = get_extra_type_or_404(db, payload.extra_type_id)
    validate_work_extra(payload)
    unit_price = resolve_unit_price(db, extra_type, payload.unit_price)
    amount = calculate_amount(payload.quantity, unit_price, payload.amount)
    work_extra = WorkExtra(
        **payload.model_dump(exclude={"amount", "unit_price"}),
        unit_price=unit_price,
        amount=amount,
    )
    db.add(work_extra)
    db.commit()
    db.refresh(work_extra)
    return work_extra


def update_work_extra(db: Session, work_extra: WorkExtra, payload: WorkExtraUpdate) -> WorkExtra:
    update_data = payload.model_dump(exclude_unset=True)
    if "work_shift_id" in update_data and update_data["work_shift_id"] is not None:
        if not db.query(WorkShift).filter(WorkShift.id == update_data["work_shift_id"]).first():
            raise HTTPException(status_code=404, detail="WorkShift not found")
    validate_work_extra(payload)

    extra_type = work_extra.extra_type
    if "extra_type_id" in update_data and update_data["extra_type_id"] is not None:
        extra_type = get_extra_type_or_404(db, update_data["extra_type_id"])

    if extra_type is not None and (
        "extra_type_id" in update_data or "quantity" in update_data or "unit_price" in update_data or "amount" in update_data
    ):
        new_quantity = update_data.get("quantity", work_extra.quantity)
        provided_unit_price = update_data.get("unit_price", work_extra.unit_price)
        new_unit_price = resolve_unit_price(db, extra_type, provided_unit_price)
        new_amount = update_data.get("amount", work_extra.amount)
        work_extra.unit_price = new_unit_price
        work_extra.amount = calculate_amount(new_quantity, new_unit_price, new_amount)

    for field, value in update_data.items():
        if field not in ("amount", "unit_price"):
            setattr(work_extra, field, value)

    db.commit()
    db.refresh(work_extra)
    return work_extra


def delete_work_extra(db: Session, work_extra: WorkExtra) -> None:
    db.delete(work_extra)
    db.commit()
