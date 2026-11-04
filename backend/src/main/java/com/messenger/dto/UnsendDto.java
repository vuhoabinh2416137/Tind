package com.messenger.dto;

public class UnsendDto {
    private String messageId;
    private String conversationId;
    private String userId;
    private boolean isUnsent;
    private String text;

    public UnsendDto() {}

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public boolean isUnsent() { return isUnsent; }
    public void setUnsent(boolean unsent) { isUnsent = unsent; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
