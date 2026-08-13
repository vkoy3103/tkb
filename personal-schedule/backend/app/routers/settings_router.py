from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.setting import SettingsRead, SettingsUpdate
from app.services.settings_service import get_settings_db, update_settings

router = APIRouter()


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("/settings", response_model=SettingsRead)
def read_settings(db: Session = Depends(get_db)):
    settings = get_settings_db(db)
    if settings is None:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings


@router.put("/settings", response_model=SettingsRead)
def update_settings_endpoint(payload: SettingsUpdate, db: Session = Depends(get_db)):
    return update_settings(db, payload)
