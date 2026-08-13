from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import DATA_DIR, SessionLocal, SQLITE_PATH

router = APIRouter()


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("/backup")
def export_database():
    if not SQLITE_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found")
    return FileResponse(path=SQLITE_PATH, filename="schedule.db", media_type="application/x-sqlite3")


@router.post("/restore")
def restore_database(file: UploadFile = File(...)):
    if not file.filename.endswith(".db") and not file.filename.endswith(".sqlite"):
        raise HTTPException(status_code=400, detail="Invalid database file")
    file_path = DATA_DIR / "schedule_restore.db"
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
    SQLITE_PATH.unlink(missing_ok=True)
    file_path.rename(SQLITE_PATH)
    return {"detail": "Database restored successfully"}
