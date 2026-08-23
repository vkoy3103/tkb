from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.work_extra_type import WorkExtraType
from app.schemas.work_extra_type import WorkExtraTypeCreate, WorkExtraTypeUpdate

DEFAULT_EXTRA_TYPES = [
    # code, name, unit, rate_type, rate_value, description
    ("NPC", "Phụ thu NPC", "giờ", "FIXED", 20000.0, "Tiền NPC theo giờ"),
    ("OT", "Làm thêm OT", "giờ", "MULTIPLIER", 2.0, "OT = 2 x lương cơ bản"),
    ("EXTEND", "Kéo dài ca", "lần", "FIXED", 50000.0, "Tiền mỗi lần EXTEND"),
]


def ensure_user_work_extra_types(db: Session, user_id: int) -> None:
    """Tạo các loại phụ thu mặc định cho một user nếu chưa có (theo user_id)."""
    for code, name, unit, rate_type, rate_value, description in DEFAULT_EXTRA_TYPES:
        exists = (
            db.query(WorkExtraType)
            .filter(WorkExtraType.user_id == user_id, WorkExtraType.code == code)
            .first()
        )
        if not exists:
            db.add(
                WorkExtraType(
                    user_id=user_id,
                    code=code,
                    name=name,
                    unit=unit,
                    rate_type=rate_type,
                    rate_value=rate_value,
                    description=description,
                    is_active=True,
                )
            )
    db.commit()


def get_work_extra_types(db: Session, user_id: int) -> list[WorkExtraType]:
    return (
        db.query(WorkExtraType)
        .filter(WorkExtraType.user_id == user_id)
        .order_by(WorkExtraType.code)
        .all()
    )


def get_work_extra_type(db: Session, user_id: int, extra_type_id: int) -> WorkExtraType | None:
    return (
        db.query(WorkExtraType)
        .filter(WorkExtraType.id == extra_type_id, WorkExtraType.user_id == user_id)
        .first()
    )


def create_work_extra_type(db: Session, user_id: int, payload: WorkExtraTypeCreate) -> WorkExtraType:
    exists = (
        db.query(WorkExtraType)
        .filter(WorkExtraType.user_id == user_id, WorkExtraType.code == payload.code)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail=f"WorkExtraType code '{payload.code}' already exists")
    extra_type = WorkExtraType(user_id=user_id, **payload.model_dump())
    db.add(extra_type)
    db.commit()
    db.refresh(extra_type)
    return extra_type


def update_work_extra_type(db: Session, extra_type: WorkExtraType, payload: WorkExtraTypeUpdate) -> WorkExtraType:
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        exists = (
            db.query(WorkExtraType)
            .filter(
                WorkExtraType.user_id == extra_type.user_id,
                WorkExtraType.code == update_data["code"],
                WorkExtraType.id != extra_type.id,
            )
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail=f"WorkExtraType code '{update_data['code']}' already exists")
    for field, value in update_data.items():
        setattr(extra_type, field, value)
    db.commit()
    db.refresh(extra_type)
    return extra_type


def delete_work_extra_type(db: Session, extra_type: WorkExtraType) -> None:
    db.delete(extra_type)
    db.commit()
