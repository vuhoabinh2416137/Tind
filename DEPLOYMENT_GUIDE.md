# 🌐 Hướng Dẫn Deploy Ứng Dụng Messenger Web Lên Online (Miễn Phí 100%)

Chào bạn! Ứng dụng Messenger Web đã được cấu hình tối ưu để có thể **chạy trên môi trường internet toàn cầu**, hỗ trợ kết nối thời gian thực qua WebSockets (Socket.IO) và phục vụ trọn gói cả Backend + Frontend trên 1 cổng duy nhất.

Dưới đây là 3 phương án deploy đơn giản, phổ biến và tốt nhất. **Khuyên dùng Phương án 1 (Render.com)** vì hoàn toàn miễn phí, hỗ trợ WebSockets bền vững và đã có sẵn file `render.yaml`.

---

## 🌟 PHƯƠNG ÁN 1: Deploy Lên Render.com (Khuyên dùng - Miễn phí 100%)

Render.com là nền tảng Cloud hiện đại nhất cho các ứng dụng Node.js thời gian thực có WebSockets, tự động cấp tên miền HTTPS miễn phí (`https://ten-app-cua-ban.onrender.com`).

### Bước 1: Đẩy mã nguồn lên GitHub của bạn
1. Truy cập [github.com](https://github.com) và tạo một Repository mới (ví dụ: `messenger-web`, chọn chế độ **Public** hoặc **Private**).
2. Mở PowerShell tại thư mục dự án `C:\Users\mrore\Tind` và chạy 3 lệnh sau (thay URL bằng link repo GitHub của bạn):
   ```bash
   git branch -M main
   git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/TÊN_REPO.git
   git push -u origin main
   ```

### Bước 2: Tạo Web Service trên Render
1. Truy cập [render.com](https://render.com) và đăng nhập bằng tài khoản GitHub.
2. Bấm nút **New +** ở góc trên bên phải ➔ Chọn **Web Service**.
3. Chọn Repository GitHub vừa tạo (`messenger-web`) và bấm **Connect**.
4. Điền các thông số như sau:
   - **Name**: `messenger-web` (hoặc tên bất kỳ bạn thích).
   - **Region**: `Singapore` (để tốc độ tải từ Việt Nam nhanh nhất).
   - **Runtime**: `Node`.
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: Chọn **Free** ($0/tháng).
5. Cuộn xuống mục **Environment Variables** (Tùy chọn):
   - Thêm `NODE_ENV` = `production`
   - Thêm `PORT` = `10000`
6. Bấm nút **Create Web Service**.

> ⏳ Render sẽ tự động kéo code, build frontend và khởi chạy server trong khoảng 2 phút. Sau khi hoàn tất, bạn sẽ nhận được đường link online dạng:
> **`https://messenger-web-xxxx.onrender.com`**
> Bạn có thể gửi link này cho bạn bè ở bất kỳ đâu để cùng vào chat!

---

## 🚂 PHƯƠNG ÁN 2: Deploy Lên Railway.app (Siêu tốc độ)

Railway cũng hỗ trợ Node.js + WebSockets cực tốt và deploy tự động qua GitHub:

1. Truy cập [railway.app](https://railway.app) và đăng nhập bằng GitHub.
2. Bấm **New Project** ➔ Chọn **Deploy from GitHub repo**.
3. Chọn repo `messenger-web`.
4. Railway sẽ tự động nhận diện `Dockerfile` hoặc `package.json` và deploy ngay lập tức!
5. Vào tab **Settings** ➔ Tại mục **Networking**, bấm **Generate Domain** để nhận đường link công khai dạng `https://messenger-web.up.railway.app`.

---

## 🐳 PHƯƠNG ÁN 3: Chạy Bằng Docker Trên Mọi VPS / Server Riêng

Nếu bạn có VPS riêng (Ubuntu, Debian, DigitalOcean, Linode, AWS EC2):

1. Clone code về VPS:
   ```bash
   git clone <link-repo-github>
   cd Tind
   ```
2. Build Docker container:
   ```bash
   docker build -t messenger-web .
   ```
3. Chạy container:
   ```bash
   docker run -d -p 80:3001 --name messenger --restart unless-stopped messenger-web
   ```
4. Truy cập trực tiếp qua địa chỉ IP của VPS: `http://IP_CỦA_VPS`.

---

## 💡 Cách Kiểm Tra & Thử Nghiệm Chat Online Sau Khi Deploy

1. Mở đường link đã deploy trên máy tính của bạn:
   - Nhập tên hiển thị: Ví dụ **Minh Tuấn**, username `@tuan123`, chọn avatar ➔ Bấm **Bắt đầu sử dụng**.
2. Mở đường link đó trên **Điện thoại di động** hoặc bảo **Bạn bè** mở trên máy của họ:
   - Nhập tên: Ví dụ **Hồng Nhung**, username `@nhung456`.
3. Trên ô tìm kiếm:
   - Minh Tuấn gõ `@nhung456` ➔ Bấm nút **Nhắn** để bắt đầu cuộc trò chuyện.
   - Thử gửi tin nhắn, thả cảm xúc (❤️, 👍, 😂), gửi ảnh và thấy tin nhắn nhảy tức thì theo thời gian thực!
