source .venv/Scripts/activate
uvicorn app.main:app --reload

# Backend Structure

Tài liệu này giúp bạn đọc nhanh cấu trúc backend và biết mỗi folder/file làm gì.

## Tổng quan

```text
backend/
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── main.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── period.py
│   │   ├── schedule.py
│   │   ├── schedule_override.py
│   │   ├── setting.py
│   │   ├── subject.py
│   │   ├── work_extra.py
│   │   └── work_shift.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── backup_router.py
│   │   ├── schedule_router.py
│   │   ├── settings_router.py
│   │   ├── statistics_router.py
│   │   ├── subject_router.py
│   │   ├── work_extra_router.py
│   │   └── work_shift_router.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── schedule.py
│   │   ├── setting.py
│   │   ├── subject.py
│   │   ├── work_extra.py
│   │   └── work_shift.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── schedule_service.py
│   │   ├── settings_service.py
│   │   ├── statistics_service.py
│   │   ├── subject_service.py
│   │   ├── work_extra_service.py
│   │   └── work_shift_service.py
│   └── utils/
│       └── __init__.py
├── data/
├── requirements.txt
├── run.py
└── .venv/
```

## Mô tả từng phần

### 1. app/
Là folder chính của API backend.

- `main.py`: file khởi tạo FastAPI app, đăng ký routers và startup hook.
- `database.py`: cấu hình database, SQLAlchemy engine, Base model.
- `__init__.py`: package init.

### 2. models/
Chứa các model tương ứng với database tables.

- `subject.py`: môn học
- `schedule.py`: lịch học / class_schedules
- `schedule_override.py`: thay đổi lịch / schedule_overrides
- `period.py`: tiết học / periods
- `work_shift.py`: ca làm việc / work_shifts
- `work_extra.py`: phụ cấp / work_extras
- `setting.py`: cấu hình hệ thống / settings

Mục tiêu: định nghĩa schema dữ liệu và các quan hệ SQLAlchemy.

### 3. routers/
Chứa API endpoints.

- `subject_router.py`: quản lý môn học
- `schedule_router.py`: quản lý lịch học
- `settings_router.py`: cấu hình hệ thống
- `statistics_router.py`: thống kê
- `work_shift_router.py`: ca làm việc
- `work_extra_router.py`: phụ cấp / chi phí
- `backup_router.py`: sao lưu / phục hồi dữ liệu

Mỗi router thường:
- nhận request từ frontend
- gọi service
- trả về response JSON

### 4. services/
Chứa logic nghiệp vụ.

- `subject_service.py`: xử lý CRUD môn học
- `schedule_service.py`: logic lịch học
- `settings_service.py`: logic default settings và cấu hình
- `statistics_service.py`: tính báo cáo / thống kê
- `work_shift_service.py`: logic ca làm việc
- `work_extra_service.py`: logic phụ cấp / khoản thêm

Nói ngắn gọn: router gọi service, service xử lý dữ liệu và database.

### 5. schemas/
Chứa Pydantic schemas để validate request/response.

Mỗi file tương ứng với model chính, ví dụ:
- `subject.py`: payload môn học
- `schedule.py`: payload lịch học
- `work_shift.py`: payload ca làm việc
- `setting.py`: payload cấu hình
- `work_extra.py`: payload phụ cấp

### 6. utils/
Chứa helper functions, tiện ích dùng chung.

Hiện tại folder này còn rỗng hoặc ít logic, nhưng có thể dùng cho:
- format datetime
- validate dữ liệu
- parse JSON
- helper chung

### 7. data/
Nơi lưu dữ liệu ứng dụng như SQLite database hoặc backup data.

### 8. requirements.txt
Danh sách dependency Python cần cài cho backend.

### 9. run.py
File chạy app backend bằng uvicorn.

```bash
python run.py
```

## Luồng hoạt động điển hình

```text
Frontend -> API Router -> Service -> Database Model -> SQLite
```

Ví dụ:

1. Frontend gọi API /api/subjects
2. `subject_router.py` nhận request
3. `subject_service.py` xử lý logic
4. SQLAlchemy query tới database
5. Trả JSON về frontend

## Nên bắt đầu từ đâu

Nếu bạn muốn hiểu nhanh, nên đọc theo thứ tự:

1. `app/main.py`
2. `app/database.py`
3. `app/models/`
4. `app/routers/`
5. `app/services/`
6. `app/schemas/`

## Gợi ý khi phát triển

- Thêm model mới thì cập nhật `models/`
- Thêm API mới thì thêm route trong `routers/`
- Thêm logic nghiệp vụ thì viết trong `services/`
- Dữ liệu request/response thì định nghĩa trong `schemas/`

## Lưu ý

Dự án đang dùng FastAPI + SQLAlchemy + SQLite.

Nếu cần, bạn có thể mở các file sau để bắt đầu:

- [app/main.py](app/main.py)
- [app/database.py](app/database.py)
- [app/models/subject.py](app/models/subject.py)
- [app/routers/subject_router.py](app/routers/subject_router.py)
- [app/services/subject_service.py](app/services/subject_service.py)
