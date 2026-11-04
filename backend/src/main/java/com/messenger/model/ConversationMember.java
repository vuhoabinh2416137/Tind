package com.messenger.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "conversation_members")
public class ConversationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String conversationId;

    @Column(nullable = false)
    private String userId;

    private Long joinedAt = Instant.now().toEpochMilli();

    public ConversationMember() {}

    public ConversationMember(String conversationId, String userId) {
        this.conversationId = conversationId;
        this.userId = userId;
        this.joinedAt = Instant.now().toEpochMilli();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Long getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Long joinedAt) { this.joinedAt = joinedAt; }
}
