# Triển khai lên hosting miễn phí (Deploy)

Ứng dụng đã được chuẩn bị sẵn cho production:
- Backend (FastAPI) **tự phục vụ luôn frontend build** (`frontend/dist`) → chỉ cần **1 cổng duy nhất**, 1 URL.
- Frontend dùng đường dẫn tương đối `/api` → không cần cấu hình CORS / nhiều cổng.
- Khởi động production: chỉ cần chạy uvicorn, mở `http://<host>:8000` là ra app hoàn chỉnh.

```
Procfile        → web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
backend/wsgi.py → entrypoint WSGI cho PythonAnywhere (dùng a2wsgi)
```

> ⚠️ **Quan trọng về dữ liệu**: app dùng **SQLite** (file `backend/data/schedule.db`).
> Chọn hosting có **ổ đĩa bền vững (persistent disk)** để dữ liệu không mất khi restart/redeploy.
> Trước khi deploy, nên chạy "Xuất" backup trên trang Settings để giữ dữ liệu an toàn.

---

## 🚀 Chạy hằng ngày với PostgreSQL (local)

Dự án có hỗ trợ chạy local với **PostgreSQL qua Docker** (xem `docker-compose.yml` + mục 8 của `PROJECT_OVERVIEW.md`). Có script khởi động nhanh ở thư mục gốc:

```bash
# Chạy backend trên Postgres (tự bật Docker + mở app tại http://127.0.0.1:8000)
bash start_postgres.sh

# Tùy chọn khác
bash start_postgres.sh --seed   # chạy + seed lại dữ liệu lên Postgres
bash start_postgres.sh --pg     # chỉ bật Postgres + pgAdmin (không chạy backend)
```

Làm thủ công từng bước:
```bash
# 1) Bật Postgres + pgAdmin
docker compose up -d db pgadmin

# 2) Chạy backend trên Postgres
cd backend
source .venv/Scripts/activate
DATABASE_URL=postgresql://postgres:123456@127.0.0.1:5433/myproject uvicorn app.main:app --host 0.0.0.0 --port 8000
```

> 💡 Chạy với **SQLite** (mặc định, không cần Docker): chỉ cần `cd backend && uvicorn app.main:app --reload` — bỏ qua bước 1 và 2 ở trên.

---

## 🏆 Lựa chọn 1: Render + Neon PostgreSQL — ⭐ KHUYÊN DÙNG (vì app đã chạy PostgreSQL, miễn phí, dữ liệu bền)

Vì app của bạn **đã chuyển sang PostgreSQL**, đây là cách phù hợp nhất (miễn phí):
- **Render** free tier tự build từ GitHub, không cần thẻ tín dụng.
- **Neon** cấp PostgreSQL miễn phí (0.5GB) → dữ liệu **bền vững**, không mất khi restart/redeploy.

> ⚠️ **Không dùng PythonAnywhere**: free tier của PythonAnywhere chỉ hỗ trợ SQLite; PostgreSQL trên PythonAnywhere là gói **trả phí**. Vì app đã dùng Postgres, hãy dùng Render + Neon.

### Bước 1 — Chuẩn bị local
```bash
cd frontend && npm run build
cd ..
# Zip toàn bộ project (bỏ node_modules, .venv) thành personal-schedule.zip
```

### Bước 2 — Tạo tài khoản & upload
1. Đăng ký miễn phí tại https://www.pythonanywhere.com
2. Vào tab **Files** → **Upload a file** → chọn `personal-schedule.zip` (hoặc clone từ GitHub nếu bạn push repo lên).
3. Giải nén: vào tab **Consoles** → **Bash**:
   ```bash
   cd ~/personal-schedule   # tên thư mục sau khi giải nén
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

### Bước 3 — Tạo Web App
1. Vào tab **Web** → **Add a new web app**
2. Chọn **Manual configuration** → Python 3.x (3.10/3.11)
3. Đường dẫn Source code: `/home/<ten>/personal-schedule`
4. Phần **Virtualenv**: chỉ tới `/home/<ten>/personal-schedule/.venv`
5. **WSGI configuration file**: sửa để trỏ tới `backend/wsgi.py`. Nội dung file WSGI thay bằng:
   ```python
   import sys
   sys.path.insert(0, '/home/<ten>/personal-schedule/backend')
   from wsgi import application
   ```
6. Bấm **Reload** → mở `https://<ten>.pythonanywhere.com` 🎉

> Nếu thư mục frontend build không ở `personal-schedule/frontend/dist`, set biến môi trường
> `FRONTEND_DIST_DIR` (tab Web → Environment variables) trỏ tới thư mục chứa `index.html`.

---

## 🥈 Lựa chọn 2: PythonAnywhere — chỉ khi muốn SQLite / chấp nhận trả phí Postgres

**Miễn phí thì chỉ có SQLite** (free tier không hỗ trợ PostgreSQL). Vì app đã dùng Postgres nên:
- Hoặc **trả phí** trên PythonAnywhere để có Postgres.
- Hoặc chuyển app về SQLite (không khuyến khích — dữ liệu bạn đang ở Postgres).

Nếu bạn vẫn muốn dùng PythonAnywhere (chỉ mình dùng, chấp nhận SQLite mới):
1. Build frontend + zip project (bỏ node_modules, .venv) thành `personal-schedule.zip`.
2. Đăng ký https://www.pythonanywhere.com → **Files** → upload zip → giải nén.
3. **Consoles** → Bash:
   ```bash
   cd ~/personal-schedule
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```
4. **Web** → Add web app → Manual configuration → Python 3.10/3.11, Source=`/home/<ten>/personal-schedule`, Virtualenv=`.venv`.
5. Sửa **WSGI configuration file** thành:
   ```python
   import sys
   sys.path.insert(0, '/home/<ten>/personal-schedule/backend')
   from wsgi import application
   ```
6. Bấm **Reload** → mở `https://<ten>.pythonanywhere.com` 🎉

### Bước 1 — Tạo PostgreSQL miễn phí trên Neon
1. Vào https://neon.tech → đăng ký (GitHub/Google).
2. Tạo project mới (region gần Việt Nam: **Singapore**).
3. Lấy **Connection string** dạng:
   ```
   postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   (Đây sẽ là `DATABASE_URL`)

### Bước 2 — Push code lên GitHub
```bash
cd /d/code/tkb/personal-schedule
git init
git add .
git commit -m "deploy"
git branch -M main
git remote add origin https://github.com/<tenban>/personal-schedule.git
git push -u origin main
```

> ⚠️ **QUAN TRỌNG — requirements.txt phải ở gốc dự án**: Render tự chạy `pip install -r requirements.txt`, nhưng chỉ tìm file này ở **gốc** (cạnh frontend/backend). Vì vậy repo đã có **bản sao `requirements.txt` ở gốc** (nội dung giống `backend/requirements.txt`) — nếu sửa file trong `backend/requirements.txt`, nhớ **copy sang `requirements.txt` ở gốc** luôn.

### Bước 3 — Tạo Web Service trên Render
1. Vào https://dashboard.render.com → **New +** → **Web Service** → connect repo GitHub.
2. Cấu hình:
   - **Name**: `personal-schedule`
   - **Environment**: `Python 3`
   - **Root Directory**: `personal-schedule` *(nếu repo của bạn chứa dự án trong thư mục con này)*
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Chọn plan **Free**
3. Phần **Environment Variables** thêm:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Connection string Neon ở Bước 1 |
   | `SECRET_KEY` | Một chuỗi bí mật dài (vd `openssl rand -hex 32`). Quan trọng để JWT an toàn |
   | `CORS_ORIGINS` | `https://<ten>.onrender.com` (hoặc để trống cũng được vì frontend/backend cùng origin) |
4. Bấm **Create Web Service** → Render tự build + deploy.
5. Mở URL `https://<ten>.onrender.com` 🎉

> ⚠️ **Lưu ý free tier**: Render free web service sẽ **sleep** sau ~15 phút không truy cập; lần mở đầu sau khi sleep sẽ chậm vài giây. Đây là đặc điểm free, chấp nhận được.

### (Tùy chọn) Cấu hình database ngay lần đầu
Sau khi deploy xong, mở `https://<ten>.onrender.com` → đăng ký tài khoản đầu tiên → app tự tạo bảng + dữ liệu mặc định cho bạn (startup tự `create_all` + seed admin + periods).

---

## 🥉 Lựa chọn 3: Docker (bất kỳ host nào có Docker — VPS, Railway, Fly.io...)

Dự án có sẵn `Dockerfile` (multi-stage: tự build frontend rồi chạy backend) — chỉ cần:

```bash
# Build image
cd /d/code/tkb/personal-schedule
docker build -t personal-schedule .

# Chạy (SQLite mặc định — dữ liệu trong volume backend-data)
docker run -p 8000:8000 -v personal-data:/app/backend/data personal-schedule

# Hoặc chạy với PostgreSQL: set DATABASE_URL
docker run -p 8000:8000 -e DATABASE_URL=postgresql://user:pass@host:5432/db personal-schedule
```

> ⚠️ Nếu dùng SQLite, nhớ mount volume vào `/app/backend/data` để dữ liệu không mất khi container restart.

---

## 🏅 Lựa chọn 4: Railway / Fly.io (free allowance, có disk bền)

- **Railway**: dùng volume bền (persistent volume) gắn vào `/backend/data` để giữ SQLite; start = `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **Fly.io**: tạo volume, mount vào đường dẫn chứa `backend/data`, start bằng uvicorn. Có allowance miễn phí hàng tháng.

---

## Chạy production ngay trên máy này (không cần mở VS Code)

Nếu bạn chỉ muốn mở app mà không bật code editor mỗi lần (máy mình, không đưa lên mạng):

```bash
cd frontend && npm run build        # build 1 lần (sau mỗi lần sửa code)
cd ../backend && source .venv/Scripts/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Rồi mở `http://localhost:8000` — **backend phục vụ luôn cả frontend**, không cần `npm run dev` nữa.
Có thể tạo file `start.bat`:
```bat
@echo off
cd /d D:\code\tkb\personal-schedule\backend
call .venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Nhấp đúp `start.bat` là chạy. (Nhớ build frontend lại sau khi sửa code.)

---

## Ghi chú dev sau khi đổi

- Dev vẫn dùng `npm run dev` (Vite proxy `/api` → `127.0.0.1:8000`), nên không cần đổi gì.
- `VITE_API_BASE_URL` vẫn có thể ghi đè nếu tách frontend/backend ở nơi khác.
