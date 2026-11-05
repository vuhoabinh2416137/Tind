package com.messenger.controller;

import com.messenger.dto.AuthRequest;
import com.messenger.dto.RegisterRequest;
import com.messenger.model.User;
import com.messenger.service.EmailOtpService;
import com.messenger.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    public AuthController(UserService userService, SimpMessagingTemplate messagingTemplate) {
        this.userService = userService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String purpose = body.getOrDefault("purpose", "REGISTER");
            EmailOtpService.OtpDispatchResult result = userService.requestOtp(email, purpose);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Mã xác nhận 6 số đã được gửi tới Gmail " + result.email);
            response.put("email", result.email);
            response.put("deliveredViaSmtp", result.deliveredViaSmtp);
            if (!result.deliveredViaSmtp) {
                response.put("fallbackOtp", result.otp);
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String purpose = body.getOrDefault("purpose", "REGISTER");

        boolean valid = userService.verifyOtpCode(email, otp, purpose);
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã xác nhận Gmail không hợp lệ hoặc đã hết hạn"));
        }
        return ResponseEntity.ok(Map.of("valid", true));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String otp = body.get("otp");
            String newPassword = body.get("newPassword");
            userService.resetPassword(email, otp, newPassword);
            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            User user = userService.register(request);
            messagingTemplate.convertAndSend("/topic/presence", Map.of("userId", user.getId(), "online", true, "newUser", user));
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            User user = userService.login(request);
            userService.setUserOnline(user.getId(), true);
            messagingTemplate.convertAndSend("/topic/presence", Map.of("userId", user.getId(), "online", true));
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}
