#!/usr/bin/env bash
# ============================================================
# Khởi động toàn bộ Personal Schedule Manager với PostgreSQL
#
# Cách dùng (từ thư mục gốc của dự án):
#   bash start_postgres.sh          # chạy backend + mở trình duyệt
#   bash start_postgres.sh --seed   # chạy + seed lại dữ liệu
#   bash start_postgres.sh --pg     # chỉ khởi động Postgres + pgAdmin
#
# Dừng: Ctrl+C trong terminal đang chạy uvicorn.
# ============================================================
set -e

cd "$(dirname "$0")"

echo "🔹 [1/3] Khởi động Docker (Postgres + pgAdmin)..."
docker compose up -d db pgadmin

if [[ "$1" == "--pg" ]]; then
  echo "✅ Postgres  : localhost:5433 (myproject)"
  echo "✅ pgAdmin   : http://127.0.0.1:5050  (admin@example.com / admin)"
  exit 0
fi

if [[ "$1" == "--seed" ]]; then
  echo "🔹 [2/3] Seed lại dữ liệu lên PostgreSQL..."
  (cd backend && source .venv/Scripts/activate \
    && DATABASE_URL=postgresql://postgres:123456@127.0.0.1:5433/myproject python -m data.seed)
fi

echo "🔹 [3/3] Chạy backend trên PostgreSQL..."
echo "   Mở app tại: http://127.0.0.1:8000"
echo "   (Ctrl+C để dừng)"
(cd backend && source .venv/Scripts/activate \
  && DATABASE_URL=postgresql://postgres:123456@127.0.0.1:5433/myproject \
     uvicorn app.main:app --host 0.0.0.0 --port 8000)
