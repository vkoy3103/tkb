from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from app.routers.work_shift_router import router as work_shift_router
from app.services.settings_service import ensure_default_settings

app = FastAPI(
    title="Personal Schedule Manager",
    description="Personal timetable and work schedule management API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
app.include_router(settings_router, prefix="/api")
app.include_router(statistics_router, prefix="/api")
app.include_router(backup_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        ensure_default_settings()
    except SQLAlchemyError:
        pass


@app.get("/")
def root():
    return {"message": "Personal Schedule Manager API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {
        "status": "ok"
    }