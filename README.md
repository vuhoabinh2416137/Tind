# 💬 Messenger Web - Real-time Chat Application

Ứng dụng web chat thời gian thực mô phỏng giao diện và trải nghiệm của **Facebook Messenger**, được xây dựng với công nghệ hiện đại: **React 18**, **Tailwind CSS**, **Node.js**, **Express**, và **Socket.IO**.

---

## ✨ Tính Năng Nổi Bật

1. **Giao Diện Chuẩn Messenger**:
   - Tông màu xanh gradient đặc trưng (#0084FF).
   - Chế độ Sáng / Tối (Light & Dark Mode) mượt mà.
   - Hiệu ứng âm thanh thông báo chuẩn Messenger (sử dụng Web Audio API không phụ thuộc file ngoài).
   - Thiết kế đáp ứng (Responsive), thanh cuộn siêu mỏng chuẩn Messenger.

2. **Tính Năng Chat Thời Gian Thực (Socket.IO)**:
   - **Gửi & Nhận tin nhắn tức thì**: Không cần tải lại trang.
   - **Chỉ báo gõ phím (Typing Indicator)**: 3 dấu chấm nhảy động khi đối phương đang soạn thảo.
   - **Biểu tượng cảm xúc (Reactions)**: 6 biểu tượng chuẩn (👍, ❤️, 😂, 😮, 😢, 😡) với bộ đếm và animation.
   - **Thu hồi tin nhắn (Unsend)**: Người gửi có thể thu hồi tin nhắn phía cả 2 người.
   - **Đã xem (Seen Receipts)**: Hiển thị avatar thu nhỏ của người đọc ở góc dưới tin nhắn.
   - **Nút Thích nhanh (Quick Like 👍)**: Bấm 1 chạm để gửi ngay biểu tượng thích hoặc biểu tượng tùy chỉnh của cuộc trò chuyện.
   - **Trả lời tin nhắn (Quote / Reply)**: Kèm trích dẫn tin nhắn gốc.

3. **Gửi File & Hình Ảnh**:
   - Gửi ảnh trực tiếp từ máy tính (hỗ trợ JPG, PNG, GIF, WebP).
   - Xem ảnh phóng to toàn màn hình với trình xem **Media Lightbox**.
   - Thư viện ảnh đã chia sẻ trong thanh thông tin đoạn chat.

4. **Trợ Lý Thông Minh Meta AI**:
   - Tích hợp sẵn bot "Meta AI" trả lời tự động bằng tiếng Việt với các câu trả lời thông minh, dí dỏm và thân thiện.
   - Người dùng có thể trải nghiệm chat ngay lập tức mà không cần tài khoản thứ hai.

5. **Bộ Chuyển Đổi Tài Khoản Nhanh (User Switcher)**:
   - Chuyển đổi giữa các tài khoản demo (**Đức Anh**, **Bảo Long**, **Khánh Vy**, **Meta AI**) chỉ bằng 1 cú nhấp chuột.
   - Cho phép mở 2 tab trình duyệt hoặc 1 tab ẩn danh để chat 2 chiều thực tế.

6. **Tùy Chỉnh Đoạn Chat**:
   - Đổi bảng màu chủ đề (Messenger Blue, Rose Pink, Electric Purple, Emerald Green, Sunset Amber).
   - Đổi biểu tượng cảm xúc mặc định (👍, ❤️, 🔥, ⚡, 🎉, 🚀).

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Cài đặt các gói phụ thuộc (nếu chưa cài):
```bash
npm install
```

### 2. Khởi chạy ở chế độ Phát triển (Dev Mode):
Chạy đồng thời cả máy chủ Backend (Port 3001) và máy khách Frontend Vite (Port 5173):
```bash
npm run dev
```
Sau đó mở trình duyệt tại: **http://localhost:5173**

### 3. Chạy ở chế độ Production:
```bash
npm run build
npm start
```
Truy cập tại: **http://localhost:3001**

### 4. Chạy kiểm thử tự động (Test Suite):
```bash
npm test
```
Kiểm thử toàn diện REST API, kết nối 2 Socket.IO đồng thời, gửi tin nhắn, đồng bộ reaction, thu hồi tin nhắn và phản hồi từ Meta AI bot.

---

## 📁 Cấu Trúc Dự Án

```
Tind/
├── server/
│   ├── index.js          # Express server & Socket.IO realtime engine
│   ├── storage.js        # Quản lý lưu trữ tin nhắn, phòng chat, người dùng
│   └── bot.js            # Xử lý phản hồi thông minh cho Meta AI
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx             # Danh sách đoạn chat & tìm kiếm
│   │   ├── ActiveContactsTray.jsx  # Thanh bạn bè trực tuyến
│   │   ├── ChatArea.jsx            # Khung chat chính & Header
│   │   ├── MessageList.jsx         # Luồng hiển thị bong bóng tin nhắn
│   │   ├── MessageBubble.jsx       # Bong bóng chat, reactions & unsend
│   │   ├── ChatInput.jsx           # Ô nhập liệu, upload ảnh, Quick Like
│   │   ├── RightSidebar.jsx        # Thông tin chat, đổi theme, xem ảnh
│   │   ├── UserSwitcherModal.jsx   # Hộp thoại đổi tài khoản nhanh
│   │   └── MediaLightbox.jsx       # Trình xem ảnh phóng to
│   ├── context/
│   │   └── ChatContext.jsx         # Quản trị State & Socket.IO Client
│   ├── utils/
│   │   ├── sound.js                # Hiệu ứng âm thanh qua Web Audio API
│   │   └── date.js                 # Định dạng thời gian tiếng Việt
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── tests/
│   └── messenger.test.js # Test suite tự động cho REST & Socket.IO
├── package.json
├── tailwind.config.js
└── vite.config.js
```
