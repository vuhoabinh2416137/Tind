package com.messenger.controller;

import com.messenger.model.User;
import com.messenger.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    public UserController(UserService userService, SimpMessagingTemplate messagingTemplate) {
        this.userService = userService;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/search")
    public ResponseEntity<List<User>> searchUsers(@RequestParam("q") String query,
                                                  @RequestParam(value = "userId", required = false) String userId) {
        return ResponseEntity.ok(userService.searchUsers(query, userId));
    }

    @PostMapping("/{id}/presence")
    public ResponseEntity<?> updatePresence(@PathVariable("id") String userId, @RequestBody Map<String, Boolean> body) {
        boolean online = Boolean.TRUE.equals(body.get("online"));
        userService.setUserOnline(userId, online);
        messagingTemplate.convertAndSend("/topic/presence", Map.of("userId", userId, "online", online));
        return ResponseEntity.ok(Map.of("success", true));
    }
}
