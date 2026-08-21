"""
Migrate toàn bộ dữ liệu từ SQLite cũ (backend/data/schedule.db) sang PostgreSQL.

Cách chạy (từ thư mục backend, đã activate venv):
    DATABASE_URL=postgresql://postgres:123456@127.0.0.1:5433/myproject \
        python -m data.migrate_sqlite_to_postgres

- Giữ nguyên ID của mọi dòng để các quan hệ khóa ngoại không bị lệch.
- Reset sequence (auto-increment) của PostgreSQL sau khi chèn.
- XÓA sạch dữ liệu hiện có trên PostgreSQL trước khi chèn.
"""
import os
import sys
from pathlib import Path

from sqlalchemy import MetaData, Table, create_engine, func, select, text

BACKEND_DIR = Path(__file__).resolve().parent.parent
SQLITE_URL = f"sqlite:///{BACKEND_DIR / 'data' / 'schedule.db'}"
POSTGRES_URL = os.environ.get("DATABASE_URL", "")

if not POSTGRES_URL:
    print("Thiếu biến môi trường DATABASE_URL (trỏ tới PostgreSQL).", file=sys.stderr)
    sys.exit(1)

# Thứ tự chèn: bảng "cha" trước, bảng có khóa ngoại sau.
# (Xóa thì đảo ngược lại.)
TABLES = [
    "work_extra_types",  # không có FK
    "subjects",          # không có FK
    "periods",           # không có FK
    "settings",          # không có FK
    "class_schedules",   # FK -> subjects
    "work_shifts",       # không có FK
    "schedule_overrides",  # FK -> class_schedules
    "work_extras",       # FK -> work_shifts, work_extra_types
]


def main():
    src = create_engine(SQLITE_URL)
    dst = create_engine(POSTGRES_URL)

    src_meta = MetaData()
    dst_meta = MetaData()

    # Phản chiếu schema từ cả hai DB (cột & kiểu dữ liệu)
    src_meta.reflect(bind=src)
    dst_meta.reflect(bind=dst)

    print("Nguồn:", SQLITE_URL)
    print("Đích:", POSTGRES_URL)

    # 1) Xóa sạch dữ liệu trên PostgreSQL (đảo thứ tự TABLES)
    print("\n[1/3] Xóa dữ liệu cũ trên PostgreSQL...")
    with dst.begin() as conn:
        for t in reversed(TABLES):
            conn.execute(text(f'TRUNCATE TABLE "{t}" RESTART IDENTITY CASCADE'))
    print("    Đã xóa.")

    # 2) Copy dữ liệu
    print("[2/3] Copy dữ liệu từ SQLite -> PostgreSQL...")
    for t in TABLES:
        src_table = Table(t, src_meta, autoload_with=src)
        dst_table = Table(t, dst_meta, autoload_with=dst)

        with src.connect() as sconn, dst.begin() as dconn:
            rows = sconn.execute(select(src_table)).mappings().all()
            if not rows:
                print(f"    {t}: 0 dòng (bỏ qua)")
                continue
            col_names = [c.name for c in dst_table.columns]
            data = [
                {k: row[k] for k in row.keys() if k in col_names}
                for row in rows
            ]
            dconn.execute(dst_table.insert(), data)
            print(f"    {t}: {len(data)} dòng")

    # 3) Reset sequence cho các cột serial trên PostgreSQL
    print("[3/3] Reset sequence (auto-increment)...")
    with dst.begin() as conn:
        for t in TABLES:
            table = Table(t, dst_meta, autoload_with=dst)
            pk = next((c for c in table.columns if c.primary_key), None)
            if pk is None:
                continue
            seq = conn.execute(
                text("SELECT pg_get_serial_sequence(:t, :c)"),
                {"t": t, "c": pk.name},
            ).scalar()
            if not seq:
                continue
            max_id = conn.execute(
                select(func.coalesce(func.max(pk), 0)).select_from(table)
            ).scalar()
            conn.execute(
                text(f"SELECT setval(:seq, GREATEST(:max_id, 1))"),
                {"seq": seq, "max_id": max_id},
            )
            print(f"    {t}: sequence {seq} -> {max_id}")

    print("\n✅ Migrate hoàn tất! Dữ liệu SQLite đã được chuyển sang PostgreSQL.")


if __name__ == "__main__":
    main()
