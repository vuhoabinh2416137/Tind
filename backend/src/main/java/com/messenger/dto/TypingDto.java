package com.messenger.dto;

public class TypingDto {
    private String conversationId;
    private String userId;
    private boolean isTyping;

    public TypingDto() {}
    public TypingDto(String conversationId, String userId, boolean isTyping) {
        this.conversationId = conversationId;
        this.userId = userId;
        this.isTyping = isTyping;
    }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public boolean isTyping() { return isTyping; }
    public void setTyping(boolean typing) { isTyping = typing; }
}
