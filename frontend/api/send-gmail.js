import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, otp, purpose } = req.body || {};

  if (!email || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
    return res.status(400).json({ error: 'Địa chỉ Gmail người nhận không hợp lệ' });
  }

  if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
    return res.status(400).json({ error: 'Mã OTP không hợp lệ' });
  }

  const gmailUser = (process.env.GMAIL_USER || process.env.GMAIL_USERNAME || 'baredy26@gmail.com').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || 'awya ocjd yhza vfzm').replace(/\s+/g, '');

  if (!gmailUser || !gmailPass) {
    return res.status(503).json({
      error: 'Chưa cấu hình GMAIL_USER và GMAIL_APP_PASSWORD trên hệ thống để gửi email thật. Vui lòng thêm 2 biến môi trường này trên Vercel Settings -> Environment Variables.'
    });
  }

  const isReset = String(purpose).toUpperCase() === 'RESET_PASSWORD';
  const subject = isReset
    ? `${otp} là mã khôi phục mật khẩu Messenger của bạn`
    : `${otp} là mã xác nhận tài khoản Messenger của bạn`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <span style="font-size: 24px; font-weight: 800; background: linear-gradient(83.84deg, #0088FF -6.87%, #A033FF 26.54%, #FF5C87 58.58%); -webkit-background-clip: text; color: #0084FF;">
          Messenger
        </span>
      </div>
      <p style="color: #050505; font-size: 15px; line-height: 1.5; margin: 0 0 12px;">
        Xin chào <strong>${email.trim()}</strong>,
      </p>
      <p style="color: #050505; font-size: 15px; line-height: 1.5; margin: 0 0 20px;">
        ${
          isReset
            ? 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Messenger của bạn. Nhập mã xác nhận dưới đây để tiếp tục:'
            : 'Cảm ơn bạn đã đăng ký Messenger. Vui lòng nhập mã xác nhận gồm 6 chữ số dưới đây để hoàn tất xác thực tài khoản:'
        }
      </p>
      <div style="background-color: #f0f2f5; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #050505;">
          ${otp}
        </span>
      </div>
      <p style="color: #65676b; font-size: 13px; line-height: 1.5; margin: 0;">
        Mã xác nhận này có hiệu lực trong vòng 10 phút. Vì lý do bảo mật, tuyệt đối không chia sẻ mã này cho bất kỳ ai.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
      <p style="color: #8a8d91; font-size: 12px; margin: 0;">
        © Meta Messenger Security · Tin nhắn tự động từ hệ thống xác thực.
      </p>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    await transporter.sendMail({
      from: `"Messenger Security" <${gmailUser}>`,
      to: email.trim(),
      subject,
      html
    });

    return res.status(200).json({
      delivered: true,
      email: email.trim(),
      message: `Đã gửi mã xác nhận tới hộp thư Gmail ${email.trim()}`
    });
  } catch (err) {
    console.error('Nodemailer Gmail SMTP error:', err);
    return res.status(500).json({
      error: `Không thể gửi email qua Gmail SMTP: ${err.message}`
    });
  }
}
