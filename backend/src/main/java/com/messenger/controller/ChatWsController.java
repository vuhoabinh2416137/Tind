package com.messenger.controller;

import com.messenger.dto.*;
import com.messenger.model.ConversationMember;
import com.messenger.model.Message;
import com.messenger.model.User;
import com.messenger.repository.ConversationMemberRepository;
import com.messenger.service.MessageService;
import com.messenger.service.UserService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
public class ChatWsController {

    private final MessageService messageService;
    private final UserService userService;
    private final ConversationMemberRepository memberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWsController(MessageService messageService,
                            UserService userService,
                            ConversationMemberRepository memberRepository,
                            SimpMessagingTemplate messagingTemplate) {
        this.messageService = messageService;
        this.userService = userService;
        this.memberRepository = memberRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(ChatMessageDto messageDto) {
        ChatMessageDto saved = messageService.saveMessage(messageDto);

        // 1. Broadcast to conversation room
        messagingTemplate.convertAndSend("/topic/conversation." + saved.getConversationId(), saved);

        // 2. Notify all participants of the conversation
        List<ConversationMember> members = memberRepository.findByConversationId(saved.getConversationId());
        for (ConversationMember m : members) {
            messagingTemplate.convertAndSend("/topic/user." + m.getUserId(), Map.of(
                "conversationId", saved.getConversationId(),
                "lastMessage", saved
            ));
        }
    }

    @MessageMapping("/chat.typing")
    public void handleTyping(TypingDto typingDto) {
        messagingTemplate.convertAndSend(
            "/topic/conversation." + typingDto.getConversationId() + ".typing",
            typingDto
        );
    }

    @MessageMapping("/chat.react")
    public void handleReaction(ReactionDto reactionDto) {
        Map<String, List<String>> reactions = messageService.toggleReaction(
            reactionDto.getMessageId(),
            reactionDto.getUserId(),
            reactionDto.getReaction()
        );

        reactionDto.setReactions(reactions);
        messagingTemplate.convertAndSend(
            "/topic/conversation." + reactionDto.getConversationId() + ".reaction",
            reactionDto
        );
    }

    @MessageMapping("/chat.unsend")
    public void handleUnsend(UnsendDto unsendDto) {
        Message unsent = messageService.unsendMessage(unsendDto.getMessageId(), unsendDto.getUserId());
        unsendDto.setUnsent(true);
        unsendDto.setText(unsent.getContent());

        messagingTemplate.convertAndSend(
            "/topic/conversation." + unsendDto.getConversationId() + ".unsend",
            unsendDto
        );
    }

    @MessageMapping("/chat.seen")
    public void handleSeen(SeenDto seenDto) {
        messageService.markSeen(seenDto.getConversationId(), seenDto.getUserId());

        Optional<User> userOpt = userService.getUserById(seenDto.getUserId());
        userOpt.ifPresent(u -> {
            seenDto.setUserAvatar(u.getAvatar());
            seenDto.setUserName(u.getName());
        });

        messagingTemplate.convertAndSend(
            "/topic/conversation." + seenDto.getConversationId() + ".seen",
            seenDto
        );
    }
}
