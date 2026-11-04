package com.messenger.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "message_seen")
public class MessageSeen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String conversationId;

    @Column(nullable = false)
    private String messageId;

    @Column(nullable = false)
    private String userId;

    private Long seenAt = Instant.now().toEpochMilli();

    public MessageSeen() {}

    public MessageSeen(String conversationId, String messageId, String userId) {
        this.conversationId = conversationId;
        this.messageId = messageId;
        this.userId = userId;
        this.seenAt = Instant.now().toEpochMilli();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Long getSeenAt() { return seenAt; }
    public void setSeenAt(Long seenAt) { this.seenAt = seenAt; }
}
