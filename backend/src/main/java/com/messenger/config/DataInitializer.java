package com.messenger.config;

import com.messenger.dto.ChatMessageDto;
import com.messenger.model.*;
import com.messenger.repository.*;
import com.messenger.service.ConversationService;
import com.messenger.service.MessageService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final MessageRepository messageRepository;
    private final MessageService messageService;

    public DataInitializer(UserRepository userRepository,
                           ConversationRepository conversationRepository,
                           ConversationMemberRepository memberRepository,
                           MessageRepository messageRepository,
                           MessageService messageService) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.messageRepository = messageRepository;
        this.messageService = messageService;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return; // Already initialized
        }

        System.out.println("🚀 [Messenger Spring Boot] Initializing seed data...");

        // 1. Seed Users
        User ducAnh = new User(
            "u_ducanh",
            "ducanh",
            "Đức Anh",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            "Sống trọn từng khoảnh khắc ✨",
            false
        );
        ducAnh.setOnline(true);

        User baoLong = new User(
            "u_baolong",
            "baolong",
            "Bảo Long",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            "Đang phát triển hệ thống Spring Boot 💻",
            false
        );
        baoLong.setOnline(true);

        User khanhVy = new User(
            "u_khanhvy",
            "khanhvy",
            "Khánh Vy",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            "Coffee & Books ☕📖",
            false
        );
        khanhVy.setOnline(true);

        User metaAi = new User(
            "u_meta_ai",
            "meta_ai",
            "Meta AI",
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
            "Trợ lý thông minh luôn sẵn sàng 🤖",
            true
        );
        metaAi.setOnline(true);

        userRepository.saveAll(List.of(ducAnh, baoLong, khanhVy, metaAi));

        // 2. Seed Conversations
        createDirectChat(ducAnh.getId(), baoLong.getId(), "#0084FF", "👍", List.of(
            new SeedMsg(baoLong.getId(), "Chào Đức Anh! Dự án chuyển đổi sang Spring Boot 3 thế nào rồi?"),
            new SeedMsg(ducAnh.getId(), "Chào Long! Đang chạy STOMP WebSocket mượt mà và cực kỳ ổn định nhé 🚀"),
            new SeedMsg(baoLong.getId(), "Tuyệt vời luôn! Sẵn sàng deploy lên Render và Vercel chưa?")
        ));

        createDirectChat(ducAnh.getId(), khanhVy.getId(), "#E4405F", "❤️", List.of(
            new SeedMsg(khanhVy.getId(), "Đức Anh ơi, mai có đi học nhóm ở thư viện không?"),
            new SeedMsg(ducAnh.getId(), "Mai 2h chiều ở tầng 3 nhé Vy ơi! 📚")
        ));

        createDirectChat(ducAnh.getId(), metaAi.getId(), "#7B2CBF", "✨", List.of(
            new SeedMsg(metaAi.getId(), "Xin chào Đức Anh! Tôi là Meta AI trên nền tảng Spring Boot. Tôi luôn sẵn sàng hỗ trợ bạn bất kỳ lúc nào!")
        ));

        System.out.println("✅ [Messenger Spring Boot] Seed data initialized successfully.");
    }

    private static class SeedMsg {
        String senderId;
        String text;
        SeedMsg(String senderId, String text) {
            this.senderId = senderId;
            this.text = text;
        }
    }

    private void createDirectChat(String userA, String userB, String theme, String quickEmoji, List<SeedMsg> messages) {
        String convId = "c_" + (userA.compareTo(userB) < 0 ? userA + "_" + userB : userB + "_" + userA);
        Conversation conv = new Conversation(convId, "direct", theme, quickEmoji);
        conv.setUpdatedAt(Instant.now().toEpochMilli());
        conversationRepository.save(conv);

        memberRepository.save(new ConversationMember(convId, userA));
        memberRepository.save(new ConversationMember(convId, userB));

        long time = Instant.now().toEpochMilli() - (messages.size() * 3600000L);
        for (SeedMsg m : messages) {
            ChatMessageDto dto = new ChatMessageDto();
            dto.setConversationId(convId);
            dto.setSenderId(m.senderId);
            dto.setText(m.text);
            dto.setType("text");
            dto.setCreatedAt(time);
            messageService.saveMessage(dto);
            time += 3600000L;
        }
    }
}
