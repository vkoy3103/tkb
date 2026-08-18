from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.work_extra_type import WorkExtraType
from app.schemas.work_extra_type import WorkExtraTypeCreate, WorkExtraTypeUpdate


def get_work_extra_types(db: Session) -> list[WorkExtraType]:
    return db.query(WorkExtraType).order_by(WorkExtraType.code).all()


def get_work_extra_type(db: Session, extra_type_id: int) -> WorkExtraType | None:
    return db.query(WorkExtraType).filter(WorkExtraType.id == extra_type_id).first()


def create_work_extra_type(db: Session, payload: WorkExtraTypeCreate) -> WorkExtraType:
    if db.query(WorkExtraType).filter(WorkExtraType.code == payload.code).first():
        raise HTTPException(status_code=409, detail=f"WorkExtraType code '{payload.code}' already exists")
    extra_type = WorkExtraType(**payload.model_dump())
    db.add(extra_type)
    db.commit()
    db.refresh(extra_type)
    return extra_type


def update_work_extra_type(db: Session, extra_type: WorkExtraType, payload: WorkExtraTypeUpdate) -> WorkExtraType:
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        exists = (
            db.query(WorkExtraType)
            .filter(WorkExtraType.code == update_data["code"], WorkExtraType.id != extra_type.id)
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
