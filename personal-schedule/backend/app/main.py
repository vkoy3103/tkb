import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.database import Base, engine
from app.routers.backup_router import router as backup_router
from app.routers.period_router import router as period_router
from app.routers.schedule_override_router import router as schedule_override_router
from app.routers.schedule_router import router as schedule_router
from app.routers.settings_router import router as settings_router
from app.routers.statistics_router import router as statistics_router
from app.routers.subject_router import router as subject_router
from app.routers.work_extra_router import router as work_extra_router
from app.routers.work_extra_type_router import router as work_extra_type_router
from app.routers.work_shift_router import router as work_shift_router
from app.services.settings_service import ensure_default_settings

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

app.include_router(subject_router, prefix="/api")
app.include_router(period_router, prefix="/api")
app.include_router(schedule_router, prefix="/api")
app.include_router(schedule_override_router, prefix="/api")
app.include_router(work_shift_router, prefix="/api")
app.include_router(work_extra_router, prefix="/api")
app.include_router(work_extra_type_router, prefix="/api")
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
        _ensure_subject_week_columns()
    except SQLAlchemyError:
        pass
    try:
        ensure_default_settings()
    except SQLAlchemyError:
        pass


def _ensure_subject_week_columns():
    """Thêm cột week_start/week_end cho bảng subjects nếu chưa tồn tại (SQLite không có ALTER ADD IF NOT EXISTS)."""
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("subjects")]
    with engine.begin() as conn:
        if "week_start" not in columns:
            conn.execute(text("ALTER TABLE subjects ADD COLUMN week_start INTEGER"))
        if "week_end" not in columns:
            conn.execute(text("ALTER TABLE subjects ADD COLUMN week_end INTEGER"))


@app.get("/")
def root():
    return {"message": "Personal Schedule Manager API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}