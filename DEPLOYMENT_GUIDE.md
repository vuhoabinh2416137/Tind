# 🌐 Hướng Dẫn Deploy Chi Tiết: Vercel (Frontend) + Render (Backend) + Cloud Database

Chào bạn! Hệ thống Messenger Web đã được kiến trúc tách biệt hoàn hảo:
* ⚛️ **Frontend** ➔ Deploy lên **Vercel** (Nền tảng tối ưu nhất cho React/Vite, CDN toàn cầu cực nhanh).
* ☕ **Backend** ➔ Deploy lên **Render.com** (Hỗ trợ Java Spring Boot 17 qua Docker, hỗ trợ WebSockets bền vững).
* 🐘 **Database** ➔ Deploy lên **Neon.tech** hoặc **Supabase** (PostgreSQL Cloud miễn phí vĩnh viễn).

---

## 🗺️ SƠ ĐỒ KIẾN TRÚC TRIỂN KHAI

```text
[ Người Dùng (Trình Duyệt/Điện Thoại) ]
                  │
        HTTPS     ▼
  [ Vercel CDN: Frontend (React 18) ]
                  │
        WSS / STOMP WebSocket & REST API
                  ▼
  [ Render.com: Backend (Spring Boot 3) ]
                  │
        JDBC Connection (SSL)
                  ▼
  [ Neon / Supabase: Cloud PostgreSQL Database ]
```

---

## 📌 BƯỚC 1: Tạo Database PostgreSQL Miễn Phí (Neon.tech hoặc Supabase)

Chúng ta dùng **Neon.tech** (Serverless Postgres miễn phí, tạo trong 30 giây):
1. Truy cập [neon.tech](https://neon.tech) và đăng nhập bằng GitHub.
2. Bấm **Create a project**, đặt tên dự án: `messenger-db`.
3. Chọn Region: `Singapore (ap-southeast-1)` ➔ Bấm **Create project**.
4. Bạn sẽ nhận được chuỗi **Connection string** dạng:
   ```text
   postgresql://alex:AbCdEf123456@ep-cool-lake-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Hãy ghi lại 4 thông số:
   * **Host**: `ep-cool-lake-123456.ap-southeast-1.aws.neon.tech`
   * **Database**: `neondb`
   * **Username**: `alex`
   * **Password**: `AbCdEf123456`

---

## 📌 BƯỚC 2: Đẩy Toàn Bộ Dự Án Lên GitHub

Mở PowerShell tại thư mục `C:\Users\mrore\Tind` và chạy:
```bash
git add .
git commit -m "feat: complete spring boot 3 backend and react frontend for vercel and render"
git branch -M main
git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/TÊN_REPO.git
git push -u origin main
```

---

## 📌 BƯỚC 3: Deploy Backend Spring Boot Lên Render.com

1. Truy cập [render.com](https://render.com) và đăng nhập bằng GitHub.
2. Bấm nút **New +** ở góc phải ➔ Chọn **Web Service**.
3. Chọn Repository vừa tạo ➔ Bấm **Connect**.
4. Cấu hình dịch vụ:
   * **Name**: `messenger-backend`
   * **Region**: `Singapore`
   * **Root Directory**: `backend` *(Rất quan trọng! Điền đúng chữ `backend`)*
   * **Environment**: Chọn **Docker** *(Render sẽ tự động dùng file `backend/Dockerfile`)*
   * **Instance Type**: Chọn **Free** ($0/tháng).
5. Cuộn xuống mục **Environment Variables** và thêm các biến:
   * `SPRING_DATASOURCE_URL`:
     `jdbc:postgresql://ep-cool-lake-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   * `SPRING_DATASOURCE_USERNAME`: `alex`
   * `SPRING_DATASOURCE_PASSWORD`: `AbCdEf123456`
   * `SPRING_DATASOURCE_DRIVER`: `org.postgresql.Driver`
   * `SPRING_JPA_DIALECT`: `org.hibernate.dialect.PostgreSQLDialect`
   * `PORT`: `8080`
6. Bấm **Create Web Service**.

> ⏳ Render sẽ tải Docker base, build Maven và khởi chạy Spring Boot trong khoảng 3-4 phút.
> Khi hoàn tất, bạn sẽ nhận được đường link Backend dạng:
> 👉 **`https://messenger-backend-xxxx.onrender.com`**
> Bạn có thể kiểm tra đường link này tại: `https://messenger-backend-xxxx.onrender.com/health` (thấy `{"status":"ok"}`).

---

## 📌 BƯỚC 4: Deploy Frontend React Lên Vercel

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
2. Bấm **Add New...** ➔ Chọn **Project**.
3. Chọn repository của bạn ➔ Bấm **Import**.
4. Cấu hình dự án trên Vercel:
   * **Project Name**: `messenger-web`
   * **Framework Preset**: `Vite`
   * **Root Directory**: Bấm nút **Edit** và chọn thư mục `frontend` *(Rất quan trọng!)*
5. Mở mục **Environment Variables** và thêm 2 biến sau:
   * `VITE_API_URL` = `https://messenger-backend-xxxx.onrender.com` *(Link Render backend của bạn)*
   * `VITE_WS_URL` = `https://messenger-backend-xxxx.onrender.com/ws` *(Link WebSocket STOMP backend)*
6. Bấm **Deploy**.

> 🎉 Chỉ sau 30 giây, Vercel sẽ cấp cho bạn tên miền chính thức dạng:
> 👉 **`https://messenger-web-xxxx.vercel.app`**

---

## 🎯 CÁCH KIỂM THỬ ỨNG DỤNG SAU KHI DEPLOY

1. Truy cập link Vercel trên máy tính:
   * Đăng ký tên hiển thị: **Minh Tuấn** (`@tuan123`).
2. Mở link trên điện thoại của bạn hoặc gửi cho bạn bè:
   * Đăng ký tên: **Hồng Nhung** (`@nhung456`).
3. Gõ `@nhung456` vào thanh tìm kiếm và bấm **Nhắn**:
   * Tin nhắn gửi qua lại tức thì qua STOMP WebSocket.
   * Thả tim (❤️), haha (😂), gửi ảnh, thu hồi tin nhắn mượt mà.
   * Dữ liệu được lưu trữ vĩnh viễn trên Cloud PostgreSQL (Neon)!
