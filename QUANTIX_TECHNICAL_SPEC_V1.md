# 📄 BÁO CÁO KỸ THUẬT: HỆ THỐNG SIGNAL GENIUS AI (V3.0)
**Dành cho mục đích nhân bản & phát triển dự án mới**

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)
Quantix AI Core là một nền tảng tạo và quản lý tín hiệu giao dịch Forex (mục tiêu chính: EUR/USD M15) dựa trên trí tuệ nhân tạo và mô hình dữ liệu cấu trúc. Hệ thống tuân thủ ba triết lý cốt lõi:
- **Database First:** Mọi dữ liệu phải được ghi vào DB trước khi công khai.
- **Telegram Proof:** Tín hiệu chỉ được coi là hợp lệ khi có bằng chứng (Message ID) trên Telegram.
- **Multi-Platform Ready:** Giao diện người dùng (Frontend) được thiết kế để có thể tách rời và nhúng vào bất kỳ hệ thống nào.

## 2. KIẾN TRÚC HỆ THỐNG (ARCHITECTURE)
Hệ thống sử dụng mô hình **Hybrid-Cloud** kết hợp sức mạnh xử lý của Python và tốc độ phục vụ của Node.js:

1.  **Quantix_Web_Server (Node.js/Express):** Cổng giao tiếp REST API & Static File Server. Xử lý kết nối người dùng, đăng ký Telegram và hiển thị Dashboard.
2.  **Quantix_Analyzer (Python Worker):** Bộ não phân tích thị trường. Quét dữ liệu từ TwelveData, tính toán điểm tin cậy và "bơm" tín hiệu vào Supabase.
3.  **Quantix_Watcher (Python Worker):** Bộ phận thực thi vòng đời. Theo dõi biến động giá qua Binance (EURUSDT) để xác nhận khớp lệnh (Entry), chốt lời (TP), cắt lỗ (SL).

## 3. CÁC THÀNH PHẦN CỐT LÕI (CORE COMPONENTS)

### 3.1. StructureEngineV1 (Bộ máy phân tích)
- **Chức năng:** Phân tích cấu trúc thị trường (Bullish/Bearish) và tính toán độ mạnh của xu hướng (Strength).
- **Đặc điểm:** Độ nhạy (Sensitivity) có thể điều chỉnh để lọc nhiễu.

### 3.2. ConfidenceRefiner (Bộ lọc tin cậy)
- **Công thức:** `Release Confidence = Raw Confidence × Session Weight × Volatility Factor × Spread Factor`.
- **Session Weight:** Ưu tiên khung giờ Overlap giữa London và New York (13:00 - 17:00 UTC) với hệ số nhân 1.2x.
- **Output:** Giới hạn tối đa 100% để đảm bảo tính logic cho người dùng.

### 3.3. ContinuousAnalyzer (Vòng lặp scan 24/7)
- **Anti-Burst Rule (Hard Lock):** Chỉ cho phép duy nhất một tín hiệu hoạt động tại một thời điểm để tối ưu hóa vốn.
- **Auto-Janitor (Fail-Safe):** Cơ chế tự động giải phóng "đường ống" sau mỗi 3 phút nếu phát hiện lệnh kẹt.

### 3.4. SignalWatcher (Quản lý vòng đời)
- **Atomic State Transitions:** Chuyển đổi trạng thái lệnh một chiều (WAITING -> ENTRY_HIT -> CLOSED) để tránh trùng lặp thông báo.

## 4. CHIẾN THUẬT GIAO DỊCH (TRADING STRATEGY)
- **Asset:** EUR/USD (M15).
- **Entry Logic:** Future Entry (Cách giá thị trường 5 pips) để đảm bảo lệnh chỉ khớp khi xu hướng thực sự xác nhận.
- **Risk management:** TP 10 pips, SL 10 pips (Tỷ lệ R:R cố định 1:1 cho MVP).
- **Time-based Exit:** Tự hủy lệnh nếu sau 30 phút không khớp (WAITING), hoặc tự đóng lệnh sau tối đa 35 phút nếu đang chạy (ACTIVE).

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - SUPABASE)
Hệ thống sử dụng 2 bảng chính:
1.  **`fx_signals`:** Lưu giữ toàn bộ vòng đời tín hiệu (ID, trạng thái, giá vào/ra, Telegram ID, kết quả).
    - *Ràng buộc:* `result` chỉ nhận giá trị `PROFIT`, `LOSS`, `CANCELLED`.
2.  **`fx_subscribers` (New):** Lưu trữ người dùng đăng ký nhận tin (thay thế file `recipients.json` cục bộ).

## 6. HỆ THỐNG GIAO DIỆN (FRONTEND INTERFACE SYSTEMS)
Hệ thống cung cấp 2 biến thể giao diện tùy theo mục đích sử dụng:

### 6.1. Production Dashboard (`index.html`)
- **Theme:** Dark Mode (Cyberpunk/Trading aesthetic).
- **Features:**
    - **Neural Market Feed:** Log phân tích thời gian thực chạy bên phải màn hình.
    - **Social Integration:** Các nút chia sẻ Facebook, Twitter, TikTok.
    - **Security:** Tích hợp chống Inspect, chống chuột phải (tùy chọn bật/tắt).
- **Deploy Target:** Railway Production.

### 6.2. Distribution Template (`signal_template.html`)
- **Theme:** Light Mode (Clean/White aesthetic).
- **Features:**
    - **Standalone:** Nhúng sẵn toàn bộ CSS (`command-center.css` inlined), không phụ thuộc file ngoài.
    - **Simplified:** Loại bỏ cột Neural Market Feed và Social Log để tối ưu không gian cho bảng tín hiệu.
    - **Open Access:** Gỡ bỏ toàn bộ script bảo mật chặn Inspect Element.
- **Mục đích:** Dùng để gửi cho khách hàng hoặc nhúng vào website thứ 3 (WordPress, Landing Page).

## 7. CÔNG NGHỆ SỬ DỤNG (TECH STACK update)
- **Backend Web:** Node.js, Express.
- **Backend Logic:** Python 3.9+ (Analysis & Watcher).
- **Database:** Supabase (PostgreSQL).
- **Frontend:** Vanilla JS, HTML5, CSS3.
- **Deployment:** Railway Cloud (Docker/Nixpacks).

---
**Ghi chú quy trình:** Khi cập nhật hệ thống, cần đảm bảo đồng bộ API Endpoint trong cả `index.html` và `signal_template.html` nếu có thay đổi về domain backend.
