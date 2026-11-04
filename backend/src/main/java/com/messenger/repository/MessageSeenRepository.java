package com.messenger.repository;

import com.messenger.model.MessageSeen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageSeenRepository extends JpaRepository<MessageSeen, Long> {

    List<MessageSeen> findByMessageId(String messageId);

    List<MessageSeen> findByConversationIdAndUserId(String conversationId, String userId);

    Optional<MessageSeen> findByMessageIdAndUserId(String messageId, String userId);

    boolean existsByMessageIdAndUserId(String messageId, String userId);
}
