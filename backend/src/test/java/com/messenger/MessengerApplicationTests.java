package com.messenger;

import com.messenger.dto.AuthRequest;
import com.messenger.dto.RegisterRequest;
import com.messenger.model.User;
import com.messenger.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MessengerApplicationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserService userService;

    private String getBaseUrl() {
        return "http://localhost:" + port;
    }

    @Test
    void contextLoads() {
        assertNotNull(userService);
    }

    @Test
    void testHealthEndpoint() {
        ResponseEntity<Map> response = restTemplate.getForEntity(getBaseUrl() + "/health", Map.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ok", response.getBody().get("status"));
    }

    @Test
    void testNoDemoUsersExist() {
        ResponseEntity<List> response = restTemplate.getForEntity(getBaseUrl() + "/api/users", List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        for (Object item : response.getBody()) {
            if (item instanceof Map<?, ?> map) {
                Object id = map.get("id");
                assertNotEquals("u_ducanh", id);
                assertNotEquals("u_baolong", id);
                assertNotEquals("u_khanhvy", id);
                assertNotEquals("u_meta_ai", id);
            }
        }
    }

    @Test
    void testGmailOtpVerificationAndPasswordReset() {
        long suffix = System.currentTimeMillis();
        String username = "gmailuser_" + suffix;
        String email = username + "@gmail.com";

        // 1. Request OTP for registration
        ResponseEntity<Map> sendOtpRes = restTemplate.postForEntity(
            getBaseUrl() + "/api/auth/send-otp",
            Map.of("email", email, "purpose", "REGISTER"),
            Map.class
        );
        assertEquals(HttpStatus.OK, sendOtpRes.getStatusCode());
        assertNotNull(sendOtpRes.getBody());
        String registerOtp = (String) sendOtpRes.getBody().get("fallbackOtp");
        assertNotNull(registerOtp);
        assertEquals(6, registerOtp.length());

        // 2. Register with Gmail & OTP
        RegisterRequest req = new RegisterRequest();
        req.setName("Gmail Verified User");
        req.setUsername(username);
        req.setEmail(email);
        req.setPassword("initialPass123");
        req.setOtp(registerOtp);

        ResponseEntity<User> regRes = restTemplate.postForEntity(getBaseUrl() + "/api/auth/register", req, User.class);
        assertEquals(HttpStatus.OK, regRes.getStatusCode());
        assertNotNull(regRes.getBody());
        assertEquals(email, regRes.getBody().getEmail());
        assertTrue(regRes.getBody().isEmailVerified());

        // 3. Login using Gmail address
        AuthRequest loginWithGmail = new AuthRequest(email, "initialPass123");
        ResponseEntity<User> loginRes = restTemplate.postForEntity(getBaseUrl() + "/api/auth/login", loginWithGmail, User.class);
        assertEquals(HttpStatus.OK, loginRes.getStatusCode());

        // 4. Forgot password -> request RESET_PASSWORD OTP
        ResponseEntity<Map> resetOtpRes = restTemplate.postForEntity(
            getBaseUrl() + "/api/auth/send-otp",
            Map.of("email", email, "purpose", "RESET_PASSWORD"),
            Map.class
        );
        assertEquals(HttpStatus.OK, resetOtpRes.getStatusCode());
        String resetOtp = (String) resetOtpRes.getBody().get("fallbackOtp");
        assertNotNull(resetOtp);

        // 5. Reset password with OTP
        ResponseEntity<Map> resetRes = restTemplate.postForEntity(
            getBaseUrl() + "/api/auth/reset-password",
            Map.of("email", email, "otp", resetOtp, "newPassword", "newPass456"),
            Map.class
        );
        assertEquals(HttpStatus.OK, resetRes.getStatusCode());

        // 6. Verify old password fails and new password succeeds
        AuthRequest oldPassReq = new AuthRequest(email, "initialPass123");
        ResponseEntity<Map> oldRes = restTemplate.postForEntity(getBaseUrl() + "/api/auth/login", oldPassReq, Map.class);
        assertEquals(HttpStatus.NOT_FOUND, oldRes.getStatusCode());

        AuthRequest newPassReq = new AuthRequest(email, "newPass456");
        ResponseEntity<User> newLoginRes = restTemplate.postForEntity(getBaseUrl() + "/api/auth/login", newPassReq, User.class);
        assertEquals(HttpStatus.OK, newLoginRes.getStatusCode());
    }
}
