package com.messenger.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmailOtpService {

    private static final long OTP_EXPIRY_MS = 10 * 60 * 1000L; // 10 minutes
    private final SecureRandom random = new SecureRandom();
    private final Map<String, OtpRecord> otpStore = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public static class OtpRecord {
        public final String otp;
        public final long expiresAt;

        public OtpRecord(String otp, long expiresAt) {
            this.otp = otp;
            this.expiresAt = expiresAt;
        }
    }

    public static class OtpDispatchResult {
        public final String email;
        public final String otp;
        public final boolean deliveredViaSmtp;

        public OtpDispatchResult(String email, String otp, boolean deliveredViaSmtp) {
            this.email = email;
            this.otp = otp;
            this.deliveredViaSmtp = deliveredViaSmtp;
        }
    }

    private String buildKey(String email, String purpose) {
        return email.trim().toLowerCase() + ":" + (purpose != null ? purpose.trim().toUpperCase() : "GENERAL");
    }

    public OtpDispatchResult generateAndSendOtp(String email, String purpose) {
        String cleanEmail = (email == null) ? "" : email.trim().toLowerCase();
        if (!cleanEmail.matches("^[A-Za-z0-9._%+-]+@gmail\\.com$")) {
            throw new IllegalArgumentException("Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com)");
        }

        String code = String.format("%06d", 100000 + random.nextInt(900000));
        String key = buildKey(cleanEmail, purpose);
        otpStore.put(key, new OtpRecord(code, Instant.now().toEpochMilli() + OTP_EXPIRY_MS));

        boolean smtpSent = false;
        if (mailSender != null && mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank()) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(mailUsername, "Messenger Security");
                helper.setTo(cleanEmail);

                boolean isReset = "RESET_PASSWORD".equalsIgnoreCase(purpose);
                helper.setSubject(isReset
                    ? code + " là mã khôi phục mật khẩu Messenger của bạn"
                    : code + " là mã xác nhận tài khoản Messenger của bạn");

                String html = "<div style='font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;'>"
                    + "<h2 style='color:#0084FF;margin-top:0;'>Messenger</h2>"
                    + "<p style='color:#050505;font-size:15px;'>Xin chào,</p>"
                    + "<p style='color:#050505;font-size:15px;'>"
                    + (isReset
                        ? "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Messenger liên kết với Gmail này. Mã xác nhận của bạn là:"
                        : "Cảm ơn bạn đã đăng ký tài khoản Messenger. Mã xác nhận Gmail của bạn là:")
                    + "</p>"
                    + "<div style='background:#f0f2f5;padding:16px;border-radius:12px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:6px;color:#050505;margin:20px 0;'>"
                    + code
                    + "</div>"
                    + "<p style='color:#65676b;font-size:13px;'>Mã này có hiệu lực trong vòng 10 phút. Không chia sẻ mã này cho bất kỳ ai.</p>"
                    + "</div>";

                helper.setText(html, true);
                mailSender.send(message);
                smtpSent = true;
            } catch (Exception e) {
                System.err.println("⚠️ [EmailOtpService] SMTP send failed, using fallback OTP notification: " + e.getMessage());
            }
        }

        System.out.println("📧 [Gmail OTP] (" + purpose + ") -> " + cleanEmail + " : " + code + " (SMTP=" + smtpSent + ")");
        return new OtpDispatchResult(cleanEmail, code, smtpSent);
    }

    public boolean verifyOtp(String email, String otp, String purpose, boolean consume) {
        if (email == null || otp == null || otp.isBlank()) return false;
        String key = buildKey(email, purpose);
        OtpRecord record = otpStore.get(key);
        if (record == null) return false;

        if (Instant.now().toEpochMilli() > record.expiresAt) {
            otpStore.remove(key);
            return false;
        }

        boolean matches = record.otp.equals(otp.trim());
        if (matches && consume) {
            otpStore.remove(key);
        }
        return matches;
    }
}
