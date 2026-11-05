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
    void testRegisterAndLoginWithPassword() {
        String username = "testuser_" + System.currentTimeMillis();
        RegisterRequest req = new RegisterRequest();
        req.setName("Tester Messenger");
        req.setUsername(username);
        req.setPassword("secret123");

        ResponseEntity<User> regRes = restTemplate.postForEntity(getBaseUrl() + "/api/auth/register", req, User.class);
        assertEquals(HttpStatus.OK, regRes.getStatusCode());
        assertNotNull(regRes.getBody());
        assertEquals(username, regRes.getBody().getUsername());
        assertNotNull(regRes.getBody().getAvatar());

        // Valid login
        AuthRequest loginReq = new AuthRequest(username, "secret123");
        ResponseEntity<User> loginRes = restTemplate.postForEntity(getBaseUrl() + "/api/auth/login", loginReq, User.class);
        assertEquals(HttpStatus.OK, loginRes.getStatusCode());
        assertNotNull(loginRes.getBody());
        assertEquals(username, loginRes.getBody().getUsername());

        // Invalid password login
        AuthRequest wrongPassReq = new AuthRequest(username, "wrongpass");
        ResponseEntity<Map> wrongRes = restTemplate.postForEntity(getBaseUrl() + "/api/auth/login", wrongPassReq, Map.class);
        assertEquals(HttpStatus.NOT_FOUND, wrongRes.getStatusCode());
    }
}
