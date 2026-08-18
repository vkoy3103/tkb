"""WSGI entrypoint cho PythonAnywhere (chạy FastAPI qua a2wsgi).

PythonAnywhere free tier chỉ chạy được WSGI app. File này wrap app FastAPI
thành WSGI application để dùng được trên PythonAnywhere mà không cần uvicorn.
"""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

# Cho phép ghi đè thư mục frontend build (PythonAnywhere upload ở nơi khác)
os.environ.setdefault(
    "FRONTEND_DIST_DIR",
    str(BACKEND_DIR.parent / "frontend" / "dist"),
)

from a2wsgi import WSGIMiddleware  # noqa: E402
from app.main import app  # noqa: E402

application = WSGIMiddleware(app)
