from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.database import SessionLocal
from app.models.setting import Setting
from app.schemas.setting import SettingsUpdate


def get_settings_db(db: Session) -> Setting | None:
    return db.query(Setting).first()


def get_settings() -> Setting:
    with SessionLocal() as db:
        settings = get_settings_db(db)
        if settings is None:
            settings = ensure_default_settings()
        return settings


def ensure_default_settings() -> Setting:
    with SessionLocal() as db:
        settings = get_settings_db(db)
        if settings is None:
            settings = Setting()
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings


def update_settings(db: Session, payload: SettingsUpdate) -> Setting:
    settings = get_settings_db(db)
    if settings is None:
        raise HTTPException(status_code=404, detail="Settings record not found")
    for field, value in payload.model_dump().items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
