from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.setting import Setting
from app.schemas.setting import SettingsCreate, SettingsUpdate

DEFAULT_SETTING_ROWS = [
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


def get_settings_db(db: Session, user_id: int) -> list[Setting]:
    return db.query(Setting).filter(Setting.user_id == user_id).order_by(Setting.key).all()


def get_setting_db(db: Session, user_id: int, key: str) -> Setting | None:
    return db.query(Setting).filter(Setting.user_id == user_id, Setting.key == key).first()


def get_settings(user_id: int) -> list[Setting]:
    with SessionLocal() as db:
        return get_settings_db(db, user_id)


def get_rates(user_id: int) -> dict[str, float]:
    """Bảng đơn giá hiệu lực đọc từ settings.
    QUY TẮC: OT LUÔN = 2 x NORMAL_RATE (x2 lương cơ bản)."""
    with SessionLocal() as db:
        values: dict[str, float] = {}
        for setting in get_settings_db(db, user_id):
            key = setting.key.upper()
            try:
                values[key] = float(setting.value or 0)
            except (TypeError, ValueError):
                values[key] = 0.0
        values["OT_RATE"] = 2.0 * values.get("NORMAL_RATE", 0.0)
        return values


def ensure_user_settings(db: Session, user_id: int) -> None:
    """Tạo các setting mặc định cho một user nếu chưa có (theo user_id)."""
    for key, value, description in DEFAULT_SETTING_ROWS:
        if not get_setting_db(db, user_id, key):
            db.add(Setting(user_id=user_id, key=key, value=value, description=description))
    db.commit()


def ensure_default_settings() -> None:
    """Seed settings mặc định cho TẤT CẢ user (gọi khi startup)."""
    from app.models.user import User

    with SessionLocal() as db:
        user_ids = [row.id for row in db.query(User).all()]
        for uid in user_ids:
            for key, value, description in DEFAULT_SETTING_ROWS:
                if not get_setting_db(db, uid, key):
                    db.add(Setting(user_id=uid, key=key, value=value, description=description))
        db.commit()


def create_setting(db: Session, user_id: int, payload: SettingsCreate) -> Setting:
    if get_setting_db(db, user_id, payload.key):
        raise HTTPException(status_code=409, detail=f"Setting '{payload.key}' already exists")
    setting = Setting(user_id=user_id, **payload.model_dump())
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
