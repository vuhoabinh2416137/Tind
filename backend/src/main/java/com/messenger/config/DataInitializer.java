package com.messenger.config;

import com.messenger.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final List<String> DEMO_USER_IDS = List.of(
        "u_ducanh", "u_baolong", "u_khanhvy", "u_meta_ai"
    );

    private static final List<String> DEMO_CONV_IDS = List.of(
        "c_u_baolong_u_ducanh", "c_u_ducanh_u_khanhvy", "c_u_ducanh_u_meta_ai"
    );

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final MessageRepository messageRepository;

    public DataInitializer(UserRepository userRepository,
                           ConversationRepository conversationRepository,
                           ConversationMemberRepository memberRepository,
                           MessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.messageRepository = messageRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Clean up any legacy demo accounts and demo conversations if present
        for (String convId : DEMO_CONV_IDS) {
            if (conversationRepository.existsById(convId)) {
                messageRepository.findByConversationIdOrderByCreatedAtAsc(convId)
                    .forEach(m -> messageRepository.deleteById(m.getId()));
                memberRepository.deleteAll(memberRepository.findByConversationId(convId));
                conversationRepository.deleteById(convId);
            }
        }

        for (String demoId : DEMO_USER_IDS) {
            if (userRepository.existsById(demoId)) {
                userRepository.deleteById(demoId);
            }
        }

        System.out.println("✅ [Messenger Spring Boot] Ready (Demo accounts purged).");
    }
}
