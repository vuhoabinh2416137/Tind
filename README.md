# 💬 Messenger Web - Spring Boot 3 & React 18 Fullstack

Hệ thống ứng dụng chat thời gian thực mô phỏng giao diện và trải nghiệm của **Facebook Messenger**, được kiến trúc lại hoàn chỉnh theo mô hình **Tách biệt Độc lập (Decoupled Fullstack)**:
* ☕ **Backend**: Java **Spring Boot 3.2.5** (Java 17, Spring Data JPA, Spring WebSocket STOMP + SockJS, H2 Database dev & PostgreSQL prod).
* ⚛️ **Frontend**: **React 18**, **Vite**, **Tailwind CSS**, **@stomp/stompjs**, tối ưu hóa triển khai trên **Vercel**.
* 🌐 **Sẵn sàng Deploy Cloud**:
  * **Frontend**: Deploy lên **Vercel** (`vercel.json`)
  * **Backend**: Deploy lên **Render.com** (Multi-stage `Dockerfile`)
  * **Database**: Tự động chuyển đổi sang **PostgreSQL Cloud** (Neon, Supabase, Render Postgres) qua biến môi trường `SPRING_DATASOURCE_URL`.

---

## 📁 Cấu Trúc Dự Án

```text
Tind/
├── backend/                       # Java Spring Boot Service
│   ├── src/main/java/com/messenger/
│   │   ├── config/                # WebSocketConfig (STOMP), CorsConfig, DataInitializer
│   │   ├── controller/            # REST & WebSocket STOMP Controllers
│   │   ├── dto/                   # DTOs truyền nhận dữ liệu
│   │   ├── model/                 # JPA Entities (User, Conversation, Message, Reaction, Seen)
│   │   ├── repository/            # Spring Data JPA Repositories
│   │   └── service/               # Logic nghiệp vụ & Trợ lý ảo Meta AI
│   ├── src/main/resources/        # application.properties (H2 dev + PostgreSQL prod)
│   ├── src/test/java/             # Spring Boot Integration Tests
│   ├── Dockerfile                 # Multi-stage Dockerfile cho Render.com
│   └── pom.xml                    # Maven Project Configuration
│
├── frontend/                      # React SPA
│   ├── src/
│   │   ├── components/            # Giao diện chuẩn Facebook Messenger
│   │   ├── context/ChatContext.jsx# STOMP WebSocket Client & State
│   │   └── utils/                 # Âm thanh thông báo Web Audio API, ngày tháng
│   ├── vercel.json                # Cấu hình Routing & Proxy trên Vercel
│   ├── package.json
│   └── vite.config.js
│
├── DEPLOYMENT_GUIDE.md            # Hướng dẫn chi tiết Deploy Vercel + Render + Cloud DB
└── README.md
```

---

## ⚡ Hướng Dẫn Chạy Dưới Local (Development)

### 1. Khởi chạy Backend (Spring Boot 3)
Mở cửa sổ Terminal thứ nhất:
```bash
cd backend
mvn spring-boot:run
```
* Backend sẽ chạy tại: **http://localhost:8080**
* Endpoint kiểm tra trạng thái: **http://localhost:8080/health**
* Giao diện H2 Database Console: **http://localhost:8080/h2-console** (JDBC URL: `jdbc:h2:file:./data/messenger_db`)
* Server sẽ tự động khởi tạo (seed) 4 tài khoản mẫu:
  * `ducanh` (Đức Anh)
  * `baolong` (Bảo Long)
  * `khanhvy` (Khánh Vy)
  * `meta_ai` (Meta AI Bot)

### 2. Khởi chạy Frontend (React + Vite)
Mở cửa sổ Terminal thứ hai:
```bash
cd frontend
npm install
npm run dev
```
* Mở trình duyệt tại: **http://localhost:5173**

---

## ✨ Tính Năng Nổi Bật Chuẩn Facebook Messenger

1. **Giao Diện Chuẩn Messenger**:
   * Tông màu xanh gradient đặc trưng (#0084FF).
   * Chế độ Sáng / Tối (Light & Dark Mode) mượt mà.
   * Thanh Stories / Bạn bè trực tuyến với chấm xanh online.
   * Âm thanh thông báo tin nhắn (Web Audio API không phụ thuộc file ngoài).
2. **Giao Thức STOMP WebSocket Thời Gian Thực**:
   * Gửi và nhận tin nhắn tức thì qua topic `/topic/conversation.{id}`.
   * Chỉ báo đang gõ (Typing Indicator: 3 chấm nhảy động) qua `/topic/conversation.{id}.typing`.
   * Thả cảm xúc 6 biểu tượng (👍, ❤️, 😂, 😮, 😢, 😡) đồng bộ trực tiếp qua `/topic/conversation.{id}.reaction`.
   * Thu hồi tin nhắn (Unsend for everyone) qua `/topic/conversation.{id}.unsend`.
   * Trạng thái Đã xem (Seen receipt) với avatar người xem thu nhỏ qua `/topic/conversation.{id}.seen`.
   * Tùy chỉnh màu chủ đề & Quick Emoji qua `/topic/conversation.{id}.theme`.
3. **Trợ Lý Thông Minh Meta AI**:
   * Tích hợp bot thông minh trả lời tự động bằng tiếng Việt với các câu trả lời dí dỏm, tư vấn công nghệ và trò chuyện 24/7.
4. **Tìm Kiếm & Khám Phá Bạn Bè (User Discovery)**:
   * Tìm kiếm theo `@username` hoặc họ tên để bắt đầu đoạn chat mới.
5. **Đăng Nhập / Đăng Ký Đa Thiết Bị**:
   * Đăng ký tên hiển thị, `@username` và chọn avatar cá nhân.
   * Nút đổi tài khoản nhanh để kiểm thử chat 2 chiều ngay trên một máy tính.
