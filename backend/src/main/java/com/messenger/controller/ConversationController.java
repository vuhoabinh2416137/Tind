package com.messenger.controller;

import com.messenger.dto.ConversationDto;
import com.messenger.dto.CreateConversationRequest;
import com.messenger.dto.ThemeUpdateDto;
import com.messenger.model.Conversation;
import com.messenger.service.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    public ConversationController(ConversationService conversationService, SimpMessagingTemplate messagingTemplate) {
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping
    public ResponseEntity<?> getConversations(@RequestParam("userId") String userId) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId is required"));
        }
        List<ConversationDto> conversations = conversationService.getConversationsForUser(userId);
        return ResponseEntity.ok(conversations);
    }

    @PostMapping
    public ResponseEntity<?> createConversation(@RequestBody CreateConversationRequest request) {
        if (request.getUserA() == null || request.getUserB() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "userA and userB required"));
        }
        Conversation conv = conversationService.getOrCreateConversation(request.getUserA(), request.getUserB());
        return ResponseEntity.ok(conv);
    }

    @PostMapping("/{id}/theme")
    public ResponseEntity<?> updateTheme(@PathVariable("id") String id, @RequestBody ThemeUpdateDto body) {
        try {
            Conversation conv = conversationService.updateTheme(id, body.getTheme(), body.getQuickEmoji());
            messagingTemplate.convertAndSend(
                "/topic/conversation." + id + ".theme",
                Map.of("conversationId", id, "theme", conv.getTheme(), "quickEmoji", conv.getQuickEmoji())
            );
            return ResponseEntity.ok(conv);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}
