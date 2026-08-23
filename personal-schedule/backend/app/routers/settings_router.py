from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.setting import SettingsCreate, SettingsRead, SettingsUpdate
from app.services.auth_service import get_current_user
from app.services.settings_service import create_setting, delete_setting, get_setting_db, get_settings_db, update_setting

router = APIRouter(prefix="/settings", tags=["settings"])


def get_db():
    with SessionLocal() as db:
        yield db


# ----- Settings management -----

@router.get("", response_model=list[SettingsRead])
def read_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all configuration entries sorted by key name."""
    return get_settings_db(db, current_user.id)


@router.get("/{setting_key}", response_model=SettingsRead)
def read_setting(
    setting_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch one configuration value by key, such as NORMAL_RATE or OT_RATE."""
    setting = get_setting_db(db, current_user.id, setting_key)
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.post("", response_model=SettingsRead)
def create_setting_endpoint(
    payload: SettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new setting key/value pair used by salary or schedule rules."""
    return create_setting(db, current_user.id, payload)


@router.put("/{setting_key}", response_model=SettingsRead)
def update_setting_endpoint(
    setting_key: str,
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the value or description of a setting by key."""
    setting = get_setting_db(db, current_user.id, setting_key)
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return update_setting(db, setting, payload)


@router.delete("/{setting_key}")
def delete_setting_endpoint(
    setting_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a single configuration record by key."""
    setting = get_setting_db(db, current_user.id, setting_key)
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    delete_setting(db, setting)
    return {"detail": "Setting deleted"}
