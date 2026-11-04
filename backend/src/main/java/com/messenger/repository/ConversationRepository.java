package com.messenger.repository;

import com.messenger.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, String> {

    @Query("SELECT c FROM Conversation c JOIN ConversationMember cm ON c.id = cm.conversationId WHERE cm.userId = :userId ORDER BY c.updatedAt DESC")
    List<Conversation> findConversationsByUserId(String userId);
}
