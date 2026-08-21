import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_PATH = DATA_DIR / "schedule.db"

# Mặc định dùng SQLite (dev local, không cần cấu hình).
# Muốn chạy trên PostgreSQL: set biến môi trường DATABASE_URL, ví dụ:
#   DATABASE_URL=postgresql://postgres:123456@localhost:5432/myproject
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{SQLITE_PATH}")

IS_SQLITE = DATABASE_URL.startswith("sqlite")

# SQLite cần check_same_thread=False; các DB khác không dùng connect_args đặc thù
connect_args = {"check_same_thread": False} if IS_SQLITE else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()
