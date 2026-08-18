from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.setting import Setting
from app.schemas.setting import SettingsCreate, SettingsUpdate


def get_settings_db(db: Session) -> list[Setting]:
    return db.query(Setting).order_by(Setting.key).all()


def get_setting_db(db: Session, key: str) -> Setting | None:
    return db.query(Setting).filter(Setting.key == key).first()


def get_settings() -> list[Setting]:
    with SessionLocal() as db:
        return get_settings_db(db)


def get_rates() -> dict[str, float]:
    """Bảng đơn giá hiệu lực đọc từ settings.
    QUY TẮC: OT LUÔN = 2 x NORMAL_RATE (x2 lương cơ bản)."""
    with SessionLocal() as db:
        values: dict[str, float] = {}
        for setting in get_settings_db(db):
            key = setting.key.upper()
            try:
                values[key] = float(setting.value or 0)
            except (TypeError, ValueError):
                values[key] = 0.0
        values["OT_RATE"] = 2.0 * values.get("NORMAL_RATE", 0.0)
        return values


def ensure_default_settings() -> None:
    with SessionLocal() as db:
        default_rows = [
            ("NORMAL_RATE", "20000", "Lương ca NORMAL theo giờ"),
            ("NPC_RATE", "20000", "Tiền NPC theo giờ"),
            ("EXTEND_RATE", "50000", "Tiền mỗi lần EXTEND"),
            ("OT_START_TIME", "22:00", "OT chỉ được tính từ 22:00"),
            ("SHIFT_1_START", "09:00", "Giờ bắt đầu ca 1"),
            ("SHIFT_1_END", "13:00", "Giờ kết thúc ca 1"),
            ("SHIFT_2_START", "13:00", "Giờ bắt đầu ca 2"),
            ("SHIFT_2_END", "18:00", "Giờ kết thúc ca 2"),
            ("SHIFT_3_START", "18:00", "Giờ bắt đầu ca 3"),
            ("SHIFT_3_END", "22:00", "Giờ kết thúc ca 3"),
        ]
        for key, value, description in default_rows:
            if not get_setting_db(db, key):
                db.add(Setting(key=key, value=value, description=description))
        db.commit()


def create_setting(db: Session, payload: SettingsCreate) -> Setting:
    if get_setting_db(db, payload.key):
        raise HTTPException(status_code=409, detail=f"Setting '{payload.key}' already exists")
    setting = Setting(**payload.model_dump())
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def update_setting(db: Session, setting: Setting, payload: SettingsUpdate) -> Setting:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(setting, field, value)
    db.commit()
    db.refresh(setting)
    return setting


def delete_setting(db: Session, setting: Setting) -> None:
    db.delete(setting)
    db.commit()
