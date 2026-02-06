# 🚀 Tele Signal: Cloud Deployment & Setup Guide (Railway + GitHub)

Tài liệu này hướng dẫn chi tiết cách thiết lập và triển khai dự án Tele Signal lên hệ thống Cloud (Railway) để đảm bảo bảo mật và vận hành 24/7.

---

## 1. 🏗 Cấu trúc Dự án (Backend ESM)

Dự án sử dụng chuẩn **ES Modules (ESM)** để tương thích tốt nhất với các thư viện hiện đại như `@supabase/supabase-js`.

- **File chính**: `server.js` (Sử dụng `import/export`)
- **Cấu hình Package**: trong `package.json` bắt buộc phải có `"type": "module"`.
- **Scripts**: `"start": "node server.js"`.

## 2. 🔑 Biến môi trường (Environment Variables)

Trên Railway, bạn **bắt buộc** phải cấu hình các biến sau trong tab **Variables**:

| `SUPABASE_URL` | `https://xxx.supabase.co` | URL kết nối database |
| `SUPABASE_KEY` | `eyJhbGciOi...` | API Key bí mật của Supabase |
| `EMAIL_USER` | `admin@gmail.com` | Email dùng để gửi thông báo |
| `EMAIL_PASS` | `xxxx xxxx xxxx xxxx` | App Password của Gmail |
| `TELEGRAM_BOT_TOKEN` | `85579...:AAHU2...` | Token từ @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | `7985984228` | ID cá nhân để nhận thông báo |
| `TELEGRAM_GROUP_ID` | `-100xxxxxx` | (Tùy chọn) ID Group để cấp link mời |
| `PORT` | `8080` (Railway tự cấp) | Cổng để server lắng nghe |

---

## 3. ⚙️ Cấu hình Railway (Quan trọng)

Để tránh lỗi 404 và lỗi Build, hãy cấu hình trong tab **Settings** của Railway như sau:

### A. Build Section
- **Builder**: Chọn **Nixpacks** (Dù có nhãn Deprecated nhưng ổn định nhất cho Node.js hiện tại).
- **Custom Build Command**: Để **Trống** hoàn toàn.
- **Node Provider**: Đảm bảo đã nhận diện được Node.js.

### B. Deploy Section (Phần quan trọng nhất)
- **Custom Start Command**: Nhập chính xác `node server.js`.
- **Root Directory**: Để trống (mặc định gốc dự án).

### C. Networking Section
- **Public Networking**: Nhấn nút **Generate Domain** để tạo link truy cập từ Internet.
- **Port**: Đảm bảo khớp với log hiển thị (thường là 8080 hoặc 3000).

---

## 4. 🌐 Cấu hình Frontend (GitHub Pages)

Để trang web trên GitHub Pages có thể nói chuyện được với server Railway, bạn cần sửa file `index.html`:

```javascript
// Tìm dòng này trong <script> ở cuối file index.html
const API_BASE = 'https://telesignal-production.up.railway.app'; // <--- Thay link Railway của bạn vào đây
```

---

## 5. 🛠 Xử lý các lỗi thường gặp (Troubleshooting)

### ❌ Lỗi "Unexpected token '<'"
- **Nguyên nhân**: Frontend gọi sai địa chỉ API (nhận về trang 404 HTML thay vì JSON).
- **Sửa**: Kiểm tra lại `API_BASE` trong `index.html` đã khớp với link Railway chưa.

### ❌ Lỗi "supabaseUrl is required"
- **Nguyên nhân**: Server không đọc được biến môi trường.
- **Sửa**: Kiểm tra tab **Variables** trên Railway xem có thừa dấu cách hay sai chính tả không.

### ❌ Lỗi 404 khi truy cập Domain
- **Nguyên nhân**: Railway đang phục vụ file tĩnh và bỏ qua server logic.
- **Sửa**: Kiểm tra **Start Command** trong Settings. Phải có `node server.js`.

---

## 6. 🔄 Quy trình cập nhật (Update Workflow)

Mỗi khi thay đổi code:
1. `git add .`
2. `git commit -m "mô tả thay đổi"`
3. `git push origin main`
4. Đợi Railway tự động Build và Deploy (khoảng 1-2 phút).

---
*Tài liệu được khởi tạo bởi Quantix AI Core - 06/02/2026*
