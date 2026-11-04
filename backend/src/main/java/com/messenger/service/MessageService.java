package com.messenger.service;

import com.messenger.dto.ChatMessageDto;
import com.messenger.dto.TypingDto;
import com.messenger.model.*;
import com.messenger.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final MessageReactionRepository reactionRepository;
    private final MessageSeenRepository seenRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final MetaAiService metaAiService;
    private final SimpMessagingTemplate messagingTemplate;

    private final ScheduledExecutorService botScheduler = Executors.newSingleThreadScheduledExecutor();

    public MessageService(MessageRepository messageRepository,
                          MessageReactionRepository reactionRepository,
                          MessageSeenRepository seenRepository,
                          ConversationRepository conversationRepository,
                          ConversationMemberRepository memberRepository,
                          UserRepository userRepository,
                          MetaAiService metaAiService,
                          SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.reactionRepository = reactionRepository;
        this.seenRepository = seenRepository;
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.metaAiService = metaAiService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(String conversationId) {
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        return messages.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageDto saveMessage(ChatMessageDto dto) {
        String msgId = (dto.getId() != null && !dto.getId().isBlank()) 
            ? dto.getId() 
            : "m_" + Instant.now().toEpochMilli() + "_" + UUID.randomUUID().toString().substring(0, 5);

        Message message = new Message();
        message.setId(msgId);
        message.setConversationId(dto.getConversationId());
        message.setSenderId(dto.getSenderId());
        message.setContent(dto.getText());
        message.setType(dto.getType() != null ? dto.getType() : "text");
        message.setFileUrl(dto.getFileUrl());
        message.setUnsent(false);
        message.setCreatedAt(dto.getCreatedAt() != null ? dto.getCreatedAt() : Instant.now().toEpochMilli());

        if (dto.getReplyTo() != null) {
            message.setReplyToId(dto.getReplyTo().getId());
            message.setReplyToSender(dto.getReplyTo().getSenderName());
            message.setReplyToText(dto.getReplyTo().getText());
        }

        Message saved = messageRepository.save(message);

        // Update conversation last updated
        conversationRepository.findById(dto.getConversationId()).ifPresent(c -> {
            c.setUpdatedAt(saved.getCreatedAt());
            conversationRepository.save(c);
        });

        // Mark as seen by sender
        seenRepository.save(new MessageSeen(dto.getConversationId(), msgId, dto.getSenderId()));

        ChatMessageDto resultDto = toDto(saved);

        // Check if message is sent in a conversation with Meta AI Bot
        List<ConversationMember> members = memberRepository.findByConversationId(dto.getConversationId());
        boolean hasBot = members.stream().anyMatch(m -> "u_meta_ai".equals(m.getUserId()));

        if (hasBot && !"u_meta_ai".equals(dto.getSenderId())) {
            scheduleBotReply(dto.getConversationId(), dto.getSenderId(), dto.getText());
        }

        return resultDto;
    }

    private void scheduleBotReply(String conversationId, String userSenderId, String userText) {
        // 1. Send bot typing indicator after 300ms
        botScheduler.schedule(() -> {
            messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId + ".typing",
                new TypingDto(conversationId, "u_meta_ai", true)
            );
        }, 300, TimeUnit.MILLISECONDS);

        // 2. Send bot reply after 1200ms
        botScheduler.schedule(() -> {
            String replyText = metaAiService.generateReply(userText);

            ChatMessageDto botMsg = new ChatMessageDto();
            botMsg.setConversationId(conversationId);
            botMsg.setSenderId("u_meta_ai");
            botMsg.setText(replyText);
            botMsg.setType("text");
            botMsg.setCreatedAt(Instant.now().toEpochMilli());

            ChatMessageDto savedBotMsg = saveMessage(botMsg);

            // Stop typing
            messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId + ".typing",
                new TypingDto(conversationId, "u_meta_ai", false)
            );

            // Broadcast bot message
            messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId,
                savedBotMsg
            );
        }, 1200, TimeUnit.MILLISECONDS);
    }

    @Transactional
    public Map<String, List<String>> toggleReaction(String messageId, String userId, String emoji) {
        Optional<MessageReaction> existing = reactionRepository.findByMessageIdAndUserId(messageId, userId);
        if (existing.isPresent()) {
            if (existing.get().getEmoji().equals(emoji)) {
                reactionRepository.delete(existing.get());
            } else {
                existing.get().setEmoji(emoji);
                reactionRepository.save(existing.get());
            }
        } else {
            reactionRepository.save(new MessageReaction(messageId, userId, emoji));
        }

        return getReactionsMap(messageId);
    }

    @Transactional
    public Message unsendMessage(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getSenderId().equals(userId)) {
            throw new IllegalArgumentException("Only the sender can unsend this message");
        }

        message.setUnsent(true);
        message.setContent("Tin nhắn đã được thu hồi");
        message.setFileUrl(null);
        message.setReplyToId(null);
        message.setReplyToSender(null);
        message.setReplyToText(null);

        return messageRepository.save(message);
    }

    @Transactional
    public void markSeen(String conversationId, String userId) {
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        for (Message m : messages) {
            if (!m.getSenderId().equals(userId) && !seenRepository.existsByMessageIdAndUserId(m.getId(), userId)) {
                seenRepository.save(new MessageSeen(conversationId, m.getId(), userId));
            }
        }
    }

    public ChatMessageDto toDto(Message message) {
        ChatMessageDto dto = new ChatMessageDto();
        dto.setId(message.getId());
        dto.setConversationId(message.getConversationId());
        dto.setSenderId(message.getSenderId());
        dto.setText(message.getContent());
        dto.setType(message.getType());
        dto.setFileUrl(message.getFileUrl());
        dto.setUnsent(message.isUnsent());
        dto.setCreatedAt(message.getCreatedAt());

        userRepository.findById(message.getSenderId()).ifPresent(user -> {
            dto.setSenderName(user.getName());
            dto.setSenderAvatar(user.getAvatar());
        });

        if (message.getReplyToId() != null) {
            dto.setReplyTo(new ChatMessageDto.ReplyDto(
                message.getReplyToId(),
                null,
                message.getReplyToSender(),
                message.getReplyToText()
            ));
        }

        dto.setReactions(getReactionsMap(message.getId()));

        List<String> seenUsers = seenRepository.findByMessageId(message.getId()).stream()
            .map(MessageSeen::getUserId)
            .distinct()
            .collect(Collectors.toList());
        dto.setSeenBy(seenUsers);

        return dto;
    }

    private Map<String, List<String>> getReactionsMap(String messageId) {
        List<MessageReaction> reactions = reactionRepository.findByMessageId(messageId);
        Map<String, List<String>> map = new HashMap<>();
        for (MessageReaction r : reactions) {
            map.computeIfAbsent(r.getEmoji(), k -> new ArrayList<>()).add(r.getUserId());
        }
        return map;
    }
}
