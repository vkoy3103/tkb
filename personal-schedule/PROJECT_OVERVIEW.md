# Personal Schedule Manager — Tài liệu tổng quan dự án

> Tài liệu mô tả toàn bộ cấu trúc, công nghệ, dữ liệu và cách chạy của dự án **Personal Schedule Manager** (ứng dụng quản lý thời khóa biểu, ca làm việc và thu nhập cá nhân).

---

## 1. Giới thiệu

**Personal Schedule Manager** là một ứng dụng full-stack giúp quản lý:

- 📚 **Lịch học** theo từng môn, từng tiết, từng tuần (có phòng, giáo viên, màu sắc).
- 🔁 **Thay đổi lịch** (hủy tiết / dạy bù / dời lịch) qua cơ chế `schedule_overrides`.
- 💼 **Ca làm việc** và **phụ thu** (NORMAL, NPC, OT, EXTEND) kèm cách tính tiền tự động.
- 📊 **Thống kê** số giờ học, giờ làm và thu nhập theo ngày / tuần / tháng.
- ⚙️ **Cấu hình hệ thống** (đơn giá từng loại giờ, khung giờ các ca).
- 💾 **Sao lưu / phục hồi** database.

| Thành phần | Công nghệ |
|---|---|
| Backend | Python + FastAPI + SQLAlchemy 2 + SQLite |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| HTTP Client | Axios |
| Router | React Router v6 |
| Linter | Oxlint |

---

## 2. Cấu trúc thư mục tổng quan

```text
personal-schedule/
├── backend/                  # API server (FastAPI)
│   ├── app/
│   │   ├── main.py           # Khởi tạo FastAPI app, CORS, đăng ký router
│   │   ├── database.py       # SQLAlchemy engine + SessionLocal + Base
│   │   ├── models/           # SQLAlchemy models (8 bảng)
│   │   ├── routers/          # API endpoints (9 router)
│   │   ├── schemas/          # Pydantic schemas (validate request/response)
│   │   ├── services/         # Logic nghiệp vụ (8 service)
│   │   └── utils/            # Helper (hiện để trống)
│   ├── data/
│   │   ├── seed.py           # Script seed dữ liệu mẫu
│   │   └── schedule.db       # SQLite database (tạo tự động khi chạy)
│   ├── requirements.txt
│   ├── run.py                # Chạy uvicorn
│   └── README.md
├── frontend/                 # Web app (React + Vite)
│   ├── src/
│   │   ├── App.tsx           # Định nghĩa routing
│   │   ├── layouts/          # AppLayout (sidebar + main)
│   │   ├── pages/            # 8 trang chức năng
│   │   ├── components/       # Component dùng chung + timetable
│   │   ├── services/         # Axios API calls
│   │   ├── types/            # TypeScript interfaces
│   │   ├── styles/           # CSS (AppLayout, dashboard, timetable...)
│   │   └── utils/            # Helper (timeUtils)
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── PROJECT_OVERVIEW.md       # File này
```

> ⚠️ **Lưu ý**: Ở thư mục gốc có 2 file thừa nên xóa hoặc bỏ qua:
> - `WorkShiftEditor.tsx` — bản sao trùng của `frontend/src/pages/WorkShiftEditor.tsx` (import sai path `./ScheduleEditor` nên không chạy được ở root).
> - `nul` — file rác phát sinh trên Windows, không liên quan dự án.

---

## 3. Backend

### 3.1 Công nghệ & khởi động

- **FastAPI** (`app/main.py`): title "Personal Schedule Manager", version `1.0.0`, CORS cho phép `http://localhost:5173` và `http://127.0.0.1:5173`.
- **SQLite** được tạo tại `backend/data/schedule.db` (engine dùng `check_same_thread=False`).
- Trên startup: tự tạo bảng (`Base.metadata.create_all`) và gọi `ensure_default_settings()` để chèn các setting mặc định nếu chưa có.
- Endpoint gốc: `GET /` và `GET /health`.

**Cách chạy:**

```bash
# Terminal 1 — Backend
cd backend
source .venv/Scripts/activate      # Windows (Git Bash)
uvicorn app.main:app --reload
# hoặc: python run.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Frontend gọi API qua `VITE_API_BASE_URL` (mặc định `http://127.0.0.1:8000/api`).

### 3.2 Models (bảng dữ liệu) — `backend/app/models/`

| File | Bảng | Mô tả |
|---|---|---|
| `subject.py` | `subjects` | Môn học: code, name, credits, teacher, default_room, color, note, is_active |
| `period.py` | `periods` | Tiết học: period_number (unique), start_time, end_time, label |
| `schedule.py` | `class_schedules` | Lịch học: subject_id (FK), weekday (2=Thứ 2 ... 8=CN), start/end_period, room, week_start/end, note. Quan hệ `subject` và `overrides` (cascade delete) |
| `schedule_override.py` | `schedule_overrides` | Thay đổi lịch: class_schedule_id (FK), date, type (`CANCELLED`/`RESCHEDULED`), new_date, new_start/end_period, new_room, reason, note |
| `work_shift.py` | `work_shifts` | Ca làm: date, shift_type, scheduled_start/end, actual_start/end, status (mặc định `scheduled`), note. Quan hệ `extras` (cascade delete) |
| `work_extra_type.py` | `work_extra_types` | Loại phụ thu: code (unique), name, unit, rate_type (`FIXED`/`MULTIPLIER`), rate_value, description, is_active |
| `work_extra.py` | `work_extras` | Phụ thu của ca: work_shift_id (FK), extra_type_id (FK), quantity, unit_price, amount, start/end_time, note |
| `setting.py` | `settings` | Cấu hình key/value: key (unique), value, description |

Quan hệ chính:

```mermaid
erDiagram
    SUBJECTS ||--o{ CLASS_SCHEDULES : "có lịch"
    CLASS_SCHEDULES ||--o{ SCHEDULE_OVERRIDES : "bị thay đổi"
    WORK_SHIFTS ||--o{ WORK_EXTRAS : "có phụ thu"
    WORK_EXTRA_TYPES ||--o{ WORK_EXTRAS : "phân loại"
```

### 3.3 Routers & API endpoints — `backend/app/routers/`

Mọi router đều gắn prefix `/api`. Pattern chuẩn CRUD: `GET list`, `POST create`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`.

| Router | Prefix | Endpoints đặc biệt |
|---|---|---|
| `subject_router.py` | `/subjects` | CRUD môn học |
| `period_router.py` | `/periods` | Chỉ `GET` danh sách tiết |
| `schedule_router.py` | `/schedules` | CRUD lịch học |
| `schedule_override_router.py` | `/schedule-overrides` | CRUD thay đổi lịch |
| `work_shift_router.py` | `/work-shifts` | CRUD ca làm |
| `work_extra_router.py` | `/work-extras` | CRUD phụ thu (tự tính amount) |
| `settings_router.py` | `/settings` | CRUD theo **key** (không phải id) |
| `statistics_router.py` | `/statistics` | `GET /day?date=`, `GET /week?date=`, `GET /month?date=` |
| `backup_router.py` | `/backups` | `GET /export` (tải file `.db`), `POST /restore` (upload file `.db`/`.sqlite`) |

### 3.4 Services (logic nghiệp vụ) — `backend/app/services/`

- `subject_service.py`, `schedule_service.py`, `schedule_override_service.py`, `work_shift_service.py`, `period_service.py`: CRUD cơ bản.
- `settings_service.py`: đọc/ghi settings + `ensure_default_settings()` chèn 11 settings mặc định.
- `work_extra_service.py`: validate `quantity`/`unit_price`/`amount` không âm; tự tính `amount = quantity × unit_price` (nếu không truyền explicit amount).
- `statistics_service.py`: tính toán thống kê:
  - `normal_hours`: từ `actual_start` đến `min(actual_end, scheduled_end)`.
  - `ot_hours`: phần vượt qua `scheduled_end`.
  - `npc_hours`: tổng quantity của extra có code `NPC`.
  - `extend_count`: tổng quantity của extra có code `EXTEND`.
  - Thu nhập = giờ × đơn giá từ settings (`NORMAL_RATE`, `NPC_RATE`, `OT_RATE`, `EXTEND_RATE`).
  - `study_hours`: cộng dồn thời lượng tiết học của `class_schedules` trong khoảng ngày.

### 3.5 Settings mặc định

| Key | Giá trị mặc định | Mô tả |
|---|---|---|
| `NORMAL_RATE` | `20000` | Lương ca NORMAL theo giờ |
| `NPC_RATE` | `20000` | Tiền NPC theo giờ |
| `OT_RATE` | `40000` | Tiền OT theo giờ (gấp đôi NORMAL) |
| `EXTEND_RATE` | `50000` | Tiền mỗi lần EXTEND |
| `OT_START_TIME` | `22:00` | OT chỉ tính từ 22:00 |
| `SHIFT_1_START/END` | `09:00` / `13:00` | Khung giờ ca 1 |
| `SHIFT_2_START/END` | `13:00` / `18:00` | Khung giờ ca 2 |
| `SHIFT_3_START/END` | `18:00` / `22:00` | Khung giờ ca 3 |

### 3.6 Seed data — `backend/data/seed.py`

Chạy `python -m data.seed` (từ thư mục `backend`) sẽ **xóa sạch dữ liệu cũ** rồi chèn dữ liệu mẫu:

- **10 tiết học** (07:00 → 17:30, nghỉ trưa 12:00–12:30).
- **9 môn học** (Anh văn B1.1, Cơ sở dữ liệu, GDTC 3, Giải tích 2, LTHĐT, NLHĐH, PBL 2, PT&TK giải thuật, TN Vật lý).
- **9 lịch học** từ tuần 1 đến tuần 14–16.
- **11 settings** mặc định.
- **3 loại phụ thu**: `NPC` (FIXED, 20k/h), `OT` (MULTIPLIER ×2), `EXTEND` (FIXED, 50k/lần).

> Chú ý: `work_extra_types` **không bị xóa** trong đoạn xóa dữ liệu seed cũ nhưng vẫn được chèn nếu bảng trống (không có kiểm tra tồn tại trước khi `db.add_all`, nên chạy seed 2 lần có thể gây lỗi unique `code`).

---

## 4. Frontend

### 4.1 Công nghệ

- **React 19** + **TypeScript** + **Vite 8** + **Tailwind CSS 3**.
- **React Router v6** quản lý routing.
- **Axios** gọi API (baseURL mặc định `http://127.0.0.1:8000/api`).
- **FullCalendar** (`@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`) đã cài sẵn (dự định dùng cho trang Calendar).

### 4.2 Routing — `src/App.tsx` + `src/layouts/AppLayout.tsx`

| Route | Trang | Mô tả |
|---|---|---|
| `/dashboard` | `Dashboard.tsx` | Tổng quan hôm nay: thống kê ngày/tuần/tháng, lịch sắp tới, ca làm hôm nay |
| `/schedule` | `Schedule.tsx` | Thời khóa biểu tuần (timetable), thêm/sửa/xóa lịch, hủy tiết, dạy bù, thêm ca làm |
| `/calendar` | `Calendar.tsx` | Trang đang là placeholder (chưa hoàn thiện) |
| `/subjects` | `Subjects.tsx` | Quản lý danh sách môn học |
| `/work` | `Work.tsx` | Quản lý ca làm và phụ thu |
| `/statistics` | `Statistics.tsx` | Thống kê Today / This Week / This Month |
| `/settings` | `Settings.tsx` | Chỉnh đơn giá ca, khung giờ; khu vực Backup/Restore (UI) |

Sidebar gồm: 📊 Dashboard, 📅 Schedule, 📚 Subjects, 💼 Work, 📈 Statistics, ⚙️ Settings.

### 4.3 Components — `src/components/`

| Component | Mô tả |
|---|---|
| `timetable/Timetable.tsx` | Bảng thời khóa biểu tuần (tính theo múi giờ `Asia/Ho_Chi_Minh`), render lịch học + ca làm + tiết bù + gạch ngang tiết bị hủy |
| `timetable/DayColumn.tsx` | Cột từng ngày trong tuần |
| `timetable/ScheduleEvent.tsx` | Ô sự kiện (môn học / ca làm / tiết bù) |
| `timetable/SubjectSidebar.tsx` | Sidebar chọn môn để thêm nhanh |
| `timetable/TimeColumn.tsx` | Cột khung giờ các tiết |
| `ScheduleEditor.tsx` | Modal thêm/sửa lịch học (form, toast, validate) |
| `InlineScheduleEditor.tsx` | Form nhập lịch nhanh ngay trên trang |
| `MakeupScheduler.tsx` | Modal lên lịch dạy bù |
| `pages/WorkShiftEditor.tsx` | Modal thêm/sửa ca làm |

### 4.4 Services (API calls) — `src/services/`

| File | Gọi tới |
|---|---|
| `api.ts` | Axios instance chung (baseURL, header JSON) |
| `subjectApi.ts` | `/subjects` |
| `periodApi.ts` | `/periods` |
| `scheduleApi.ts` | `/schedules` |
| `scheduleOverrideApi.ts` | `/schedule-overrides` |
| `workShiftApi.ts` | `/work-shifts` |
| `workExtraApi.ts` | `/work-extras` |
| `workExtraTypeApi.ts` | `/work-extra-types` (⚠️ backend chưa có router cho endpoint này) |
| `settingsApi.ts` / `settingApi.ts` | `/settings` |
| `statisticsApi.ts` | `/statistics/day|week|month` |

### 4.5 Types chính — `src/types/index.ts`

`Subject`, `Period`, `Schedule`, `ScheduleOverride`, `WorkShift`, `WorkExtraType`, `WorkExtra`, `SettingsEntry`, `Statistics`.

---

## 5. Luồng hoạt động điển hình

```text
React Page (components)
      │  axios (services/*Api)
      ▼
FastAPI Router  (/api/*)
      │
      ▼
Service  (logic nghiệp vụ)
      │
      ▼
SQLAlchemy Model → SQLite (backend/data/schedule.db)
```

Ví dụ cụ thể — xem Dashboard:

1. `Dashboard.tsx` gọi `fetchDayStatistics`, `fetchWeekStatistics`, `fetchMonthStatistics`, `fetchSchedules`, `fetchSubjects`, `fetchPeriods`, `fetchWorkShifts`.
2. Các hàm này dùng Axios gọi `GET /api/statistics/day?date=...`, `GET /api/schedules`, ...
3. `statistics_router` → `statistics_service.make_statistics()` → truy vấn `WorkShift`, `WorkExtra`, `Schedule`, `Period`, `Setting`.
4. Trả JSON → React render các thẻ thống kê.

---

## 6. Một số lưu ý & điểm cần hoàn thiện

1. **`/calendar`** chưa triển khai (placeholder), FullCalendar đã cài sẵn nhưng chưa dùng.
2. **`workExtraTypeApi.ts`** gọi `/work-extra-types` nhưng backend **không có** `work_extra_type_router` — cần thêm hoặc bỏ.
3. **Trùng route `/health`** trong `main.py` (định nghĩa 2 lần) — không gây lỗi nhưng nên dọn.
4. **Root folder** có file thừa `WorkShiftEditor.tsx` (bản sao) và `nul` (file rác Windows).
5. **Backup/Restore** — backend đã có đủ API, nhưng UI ở `Settings.tsx` mới chỉ hiển thị mô tả, chưa có nút gọi API.
6. **`statistics_service`** dùng `current.weekday() + 2 == schedule.weekday` để map ngày (quy ước: 2 = Thứ 2 ... 8 = Chủ nhật) — lưu ý khi sửa dữ liệu.
7. Chạy `seed.py` nhiều lần có thể lỗi unique do `WorkExtraType.code` không được xóa/kiểm tra trước khi chèn.

---

## 7. Các lệnh thường dùng

```bash
# Backend
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload        # hoặc python run.py
python -m data.seed                   # reset dữ liệu mẫu

# Frontend
cd frontend
npm run dev                           # chạy dev server
npm run build                         # build production
npm run lint                          # oxlint
```
