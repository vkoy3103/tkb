# Dockerfile — Personal Schedule Manager (production)
# Multi-stage: build frontend bằng node, sau đó chạy backend FastAPI bằng python.

# ---------- Stage 1: build frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_URL="" \
    FRONTEND_DIST_DIR=/app/frontend/dist

WORKDIR /app

# Cài dependencies backend
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend + frontend build
COPY backend/ backend/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Thư mục dữ liệu (SQLite) — nên mount volume vào đây để dữ liệu bền
RUN mkdir -p /app/backend/data
VOLUME ["/app/backend/data"]

EXPOSE 8000

# Mặc định chạy với SQLite (bỏ DATABASE_URL). Muốn dùng Postgres: set env DATABASE_URL
CMD ["sh", "-c", "cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

