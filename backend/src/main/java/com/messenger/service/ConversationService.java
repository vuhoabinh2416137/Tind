package com.messenger.service;

import com.messenger.dto.ChatMessageDto;
import com.messenger.dto.ConversationDto;
import com.messenger.model.*;
import com.messenger.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final MessageService messageService;
    private final MessageSeenRepository seenRepository;

    public ConversationService(ConversationRepository conversationRepository,
                               ConversationMemberRepository memberRepository,
                               UserRepository userRepository,
                               MessageRepository messageRepository,
                               MessageService messageService,
                               MessageSeenRepository seenRepository) {
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.messageService = messageService;
        this.seenRepository = seenRepository;
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getConversationsForUser(String userId) {
        List<Conversation> conversations = conversationRepository.findConversationsByUserId(userId);
        List<ConversationDto> dtos = new ArrayList<>();

        for (Conversation c : conversations) {
            ConversationDto dto = new ConversationDto();
            dto.setId(c.getId());
            dto.setType(c.getType());
            dto.setTheme(c.getTheme());
            dto.setQuickEmoji(c.getQuickEmoji());

            List<ConversationMember> members = memberRepository.findByConversationId(c.getId());
            List<String> participantIds = members.stream()
                .map(ConversationMember::getUserId)
                .collect(Collectors.toList());
            dto.setParticipants(participantIds);

            // Find other participant for direct chat
            String otherUserId = participantIds.stream()
                .filter(p -> !p.equals(userId))
                .findFirst()
                .orElse(userId);

            Optional<User> otherUserOpt = userRepository.findById(otherUserId);
            if (otherUserOpt.isPresent()) {
                User other = otherUserOpt.get();
                dto.setName(other.getName());
                dto.setAvatar(other.getAvatar());
                dto.setOnline(other.isOnline());
                dto.setLastSeen(other.getLastSeen());
                dto.setBot(other.isBot());
            } else {
                dto.setName(c.getName() != null ? c.getName() : "Người dùng");
                dto.setAvatar(c.getAvatar());
                dto.setOnline(false);
            }

            // Get last message
            List<Message> lastMsgs = messageRepository.findTop1ByConversationIdOrderByCreatedAtDesc(c.getId());
            if (!lastMsgs.isEmpty()) {
                dto.setLastMessage(messageService.toDto(lastMsgs.get(0)));
            }

            // Calculate unread count
            List<Message> allMsgs = messageRepository.findByConversationIdOrderByCreatedAtAsc(c.getId());
            int unread = (int) allMsgs.stream()
                .filter(m -> !m.getSenderId().equals(userId) && !seenRepository.existsByMessageIdAndUserId(m.getId(), userId))
                .count();
            dto.setUnreadCount(unread);

            dtos.add(dto);
        }

        dtos.sort((a, b) -> {
            Long timeA = (a.getLastMessage() != null) ? a.getLastMessage().getCreatedAt() : 0L;
            Long timeB = (b.getLastMessage() != null) ? b.getLastMessage().getCreatedAt() : 0L;
            return timeB.compareTo(timeA);
        });

        return dtos;
    }

    @Transactional
    public Conversation getOrCreateConversation(String userA, String userB) {
        List<String> existing = memberRepository.findDirectConversationId(userA, userB);
        if (!existing.isEmpty()) {
            return conversationRepository.findById(existing.get(0)).orElseThrow();
        }

        // Create new direct conversation
        List<String> sorted = new ArrayList<>(List.of(userA, userB));
        Collections.sort(sorted);
        String convId = "c_" + String.join("_", sorted);

        Conversation conv = new Conversation(convId, "direct", "#0084FF", "👍");
        Conversation saved = conversationRepository.save(conv);

        memberRepository.save(new ConversationMember(saved.getId(), userA));
        memberRepository.save(new ConversationMember(saved.getId(), userB));

        return saved;
    }

    @Transactional
    public Conversation updateTheme(String conversationId, String theme, String quickEmoji) {
        Conversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        if (theme != null && !theme.isBlank()) conv.setTheme(theme);
        if (quickEmoji != null && !quickEmoji.isBlank()) conv.setQuickEmoji(quickEmoji);
        conv.setUpdatedAt(Instant.now().toEpochMilli());
        return conversationRepository.save(conv);
    }
}
