package com.messenger.repository;

import com.messenger.model.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationMemberRepository extends JpaRepository<ConversationMember, Long> {

    List<ConversationMember> findByConversationId(String conversationId);

    List<ConversationMember> findByUserId(String userId);

    Optional<ConversationMember> findByConversationIdAndUserId(String conversationId, String userId);

    @Query("SELECT cm1.conversationId FROM ConversationMember cm1 JOIN ConversationMember cm2 ON cm1.conversationId = cm2.conversationId WHERE cm1.userId = :userA AND cm2.userId = :userB")
    List<String> findDirectConversationId(String userA, String userB);
}
