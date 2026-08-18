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

## 🏆 Lựa chọn 1: PythonAnywhere (khuyên dùng — miễn phí vĩnh viễn, SQLite bền)

**Ưu điểm**: Free tier dữ liệu **lưu vĩnh viễn** (phù hợp SQLite), không cần thẻ tín dụng, HTTPS sẵn có, URL dạng `https://tenban.pythonanywhere.com`.

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

## 🥈 Lựa chọn 2: Render (tự động từ GitHub, miễn phí có giới hạn)

**Ưu điểm**: đẩy lên GitHub là Render tự build, không cần upload thủ công.
**Nhược điểm**: Free tier **không có persistent disk** → SQLite bị **mất khi restart/redeploy**. Chỉ dùng khi chấp nhận dữ liệu thử nghiệm, hoặc nâng cấp trả phí để thêm disk.

1. Push repo lên GitHub.
2. Tạo **New Web Service** tại https://dashboard.render.com → connect GitHub repo.
3. Cấu hình:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment** (nếu cần): `FRONTEND_DIST_DIR=/opt/render/project/src/frontend/dist`
4. Deploy → Render cấp URL `https://<ten>.onrender.com`.

---

## 🥉 Lựa chọn 3: Railway / Fly.io (free allowance, có disk bền)

- **Railway**: dùng volume bền (persistent volume) gắn vào `/backend/data` để giữ SQLite; start = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
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
