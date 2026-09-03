import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.database import Base, IS_SQLITE, SessionLocal, engine
from app.models.user import User  # noqa: F401  (đảm bảo bảng users được tạo)
from app.routers.auth_router import auth as auth_router
from app.routers.backup_router import router as backup_router
from app.routers.period_router import router as period_router
from app.routers.schedule_override_router import router as schedule_override_router
from app.routers.schedule_router import router as schedule_router
from app.routers.settings_router import router as settings_router
from app.routers.statistics_router import router as statistics_router
from app.routers.subject_router import router as subject_router
from app.routers.other_income_router import router as other_income_router
from app.routers.work_extra_router import router as work_extra_router
from app.routers.work_extra_type_router import router as work_extra_type_router
from app.routers.work_shift_router import router as work_shift_router
from app.services.settings_service import ensure_default_settings
from app.utils.security import hash_password

app = FastAPI(
    title="Personal Schedule Manager",
    description="Personal timetable and work schedule management API",
    version="1.0.0",
)

# CORS: dev dùng Vite proxy (cùng origin) nên không cần, nhưng vẫn giữ để an toàn
_cors = os.environ.get("CORS_ORIGINS", "")
allow_origins = [o.strip() for o in _cors.split(",") if o.strip()] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(subject_router, prefix="/api")
app.include_router(period_router, prefix="/api")
app.include_router(schedule_router, prefix="/api")
app.include_router(schedule_override_router, prefix="/api")
app.include_router(work_shift_router, prefix="/api")
app.include_router(work_extra_router, prefix="/api")
app.include_router(work_extra_type_router, prefix="/api")
app.include_router(other_income_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(statistics_router, prefix="/api")
app.include_router(backup_router, prefix="/api")


# ---------- Phục vụ frontend build (chạy chung 1 cổng) ----------
# Đường dẫn tới frontend/dist, có thể ghi đè bằng env FRONTEND_DIST_DIR
BACKEND_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST_DIR", "")) if os.environ.get("FRONTEND_DIST_DIR") else (
    BACKEND_DIR.parent / "frontend" / "dist"
)


def _mount_frontend():
    if not FRONTEND_DIST.is_dir():
        return
    # Tài sản tĩnh (assets/...)
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        # Ưu tiên file tĩnh thật (favicon, ...), nếu không có → trả index.html cho SPA
        candidate = (FRONTEND_DIST / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST.resolve()):
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")


_mount_frontend()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        _ensure_user_id_columns()
    except SQLAlchemyError:
        pass
    try:
        _drop_legacy_unique_constraints()
    except SQLAlchemyError:
        pass
    try:
        _ensure_subject_week_columns()
    except SQLAlchemyError:
        pass
    try:
        _ensure_work_shift_coefficient_column()
    except SQLAlchemyError:
        pass
    try:
        _sync_sequences()
    except SQLAlchemyError:
        pass
    try:
        ensure_admin_user()
    except SQLAlchemyError:
        pass
    try:
        ensure_default_settings()
    except SQLAlchemyError:
        pass


# Các bảng có cột user_id (multi-tenant)
_USER_ID_TABLES = [
    "subjects",
    "class_schedules",
    "schedule_overrides",
    "work_shifts",
    "work_extras",
    "work_extra_types",
    "settings",
]


def _ensure_user_id_columns():
    """Thêm cột user_id cho các bảng cũ (migration idempotent, hỗ trợ SQLite + Postgres)."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in _USER_ID_TABLES:
            try:
                columns = [col["name"] for col in inspector.get_columns(table)]
            except Exception:
                continue
            if "user_id" in columns:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER"))
            conn.execute(
                text(f"CREATE INDEX IF NOT EXISTS ix_{table}_user_id ON {table} (user_id)")
            )


def _ensure_subject_week_columns():
    """Thêm cột week_start/week_end cho bảng subjects nếu chưa tồn tại (SQLite không có ALTER ADD IF NOT EXISTS)."""
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("subjects")]
    with engine.begin() as conn:
        if "week_start" not in columns:
            conn.execute(text("ALTER TABLE subjects ADD COLUMN week_start INTEGER"))
        if "week_end" not in columns:
            conn.execute(text("ALTER TABLE subjects ADD COLUMN week_end INTEGER"))


def _ensure_work_shift_coefficient_column():
    """Thêm cột coefficient (hệ số ca, mặc định x1) cho bảng work_shifts nếu chưa có.
    Hệ số nhân CHỈ áp dụng cho lương cơ bản (normal), không áp cho phụ thu NPC/OT/EXTEND."""
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("work_shifts")]
    if "coefficient" in columns:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE work_shifts ADD COLUMN coefficient FLOAT DEFAULT 1.0"))
        conn.execute(text("UPDATE work_shifts SET coefficient = 1.0 WHERE coefficient IS NULL"))


def _sync_sequences():
    """Đồng bộ lại sequence (auto-increment) về max(id)+1 cho mọi bảng có khóa chính tự tăng.

    Chỉ cần cho PostgreSQL. Khi migrate dữ liệu từ SQLite/local sang Postgres (vd Neon),
    sequence thường không được cập nhật theo dữ liệu có sẵn → INSERT bị lỗi
    "duplicate key value violates unique constraint ..._pkey". Hàm này tự sửa khi startup.
    """
    if IS_SQLITE:
        return
    tables = [
        "users",
        "subjects",
        "class_schedules",
        "schedule_overrides",
        "work_shifts",
        "work_extras",
        "work_extra_types",
        "settings",
        "periods",
        "other_incomes",
    ]
    with engine.begin() as conn:
        for table in tables:
            try:
                seq = conn.execute(
                    text("SELECT pg_get_serial_sequence(:t, 'id')"), {"t": table}
                ).scalar()
                if not seq:
                    continue
                conn.execute(
                    text(f"SELECT setval(:seq, COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"),
                    {"seq": seq},
                )
            except SQLAlchemyError:
                continue


def _drop_legacy_unique_constraints():
    """Bỏ unique constraint TOÀN CỤC cũ trên settings.key / work_extra_types.code
    (multi-tenant: mỗi user có key/code riêng nên không được unique toàn DB)."""
    with engine.begin() as conn:
        if not IS_SQLITE:
            # Postgres: drop constraint + index cũ
            conn.execute(text("ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key"))
            conn.execute(text("DROP INDEX IF EXISTS ix_work_extra_types_code"))
        else:
            # SQLite: các unique được tạo khi CREATE TABLE — cần recreate table
            # (drop index thường không có hiệu lực với UNIQUE constraint)
            _recreate_table_without_unique(conn, "settings", "key")
            _recreate_table_without_unique(conn, "work_extra_types", "code")


def _recreate_table_without_unique(conn, table: str, unique_col: str):
    """SQLite: recreate bảng để bỏ unique constraint (migration đơn giản cho dev)."""
    inspector = inspect(engine)
    columns = [col for col in inspector.get_columns(table)]
    col_defs = ", ".join(
        f'"{c["name"]}" {c["type"]}'
        + (" PRIMARY KEY" if c.get("primary_key") else "")
        for c in columns
    )
    conn.execute(text(f"PRAGMA foreign_keys=OFF"))
    conn.execute(text(f'ALTER TABLE {table} RENAME TO {table}__old'))
    conn.execute(text(f"CREATE TABLE {table} ({col_defs})"))
    col_names = ", ".join(f'"{c["name"]}"' for c in columns)
    conn.execute(text(f"INSERT INTO {table} ({col_names}) SELECT {col_names} FROM {table}__old"))
    conn.execute(text(f"DROP TABLE {table}__old"))
    conn.execute(text(f"PRAGMA foreign_keys=ON"))


def ensure_admin_user():
    """Tạo tài khoản admin mặc định nếu chưa tồn tại + gán dữ liệu cũ về admin."""
    from app.models.period import Period

    with SessionLocal() as db:
        admin = db.query(User).filter(User.email == os.environ.get("ADMIN_EMAIL", "admin@example.com")).first()
        if admin is None:
            admin = User(
                email=os.environ.get("ADMIN_EMAIL", "admin@example.com"),
                password_hash=hash_password(os.environ.get("ADMIN_PASSWORD", "admin123")),
                first_name="Admin",
                last_name="System",
                role="admin",
                is_active=True,
                credit_balance=0,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        else:
            db.refresh(admin)

        # Gán dữ liệu đang không có user_id về admin (migration từ bản cũ)
        for table in _USER_ID_TABLES:
            db.execute(
                text(f"UPDATE {table} SET user_id = :uid WHERE user_id IS NULL OR user_id = 0"),
                {"uid": admin.id},
            )
        db.commit()

        # Seed periods mặc định nếu bảng trống
        if db.query(Period).count() == 0:
            from datetime import time as dt_time

            period_rows = [
                (1, dt_time(7, 0), dt_time(8, 0), "Tiết 1"),
                (2, dt_time(8, 0), dt_time(9, 0), "Tiết 2"),
                (3, dt_time(9, 0), dt_time(10, 0), "Tiết 3"),
                (4, dt_time(10, 0), dt_time(11, 0), "Tiết 4"),
                (5, dt_time(11, 0), dt_time(12, 0), "Tiết 5"),
                (6, dt_time(12, 30), dt_time(13, 30), "Tiết 6"),
                (7, dt_time(13, 30), dt_time(14, 30), "Tiết 7"),
                (8, dt_time(14, 30), dt_time(15, 30), "Tiết 8"),
                (9, dt_time(15, 30), dt_time(16, 30), "Tiết 9"),
                (10, dt_time(16, 30), dt_time(17, 30), "Tiết 10"),
            ]
            for num, start, end, label in period_rows:
                db.add(Period(period_number=num, start_time=start, end_time=end, label=label))
            db.commit()

        result = {
            "id": admin.id,
            "email": admin.email,
            "role": admin.role,
        }
        return result


@app.get("/")
def root():
    return {"message": "Personal Schedule Manager API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}