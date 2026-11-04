package com.messenger.dto;

import java.util.List;
import java.util.Map;

public class ChatMessageDto {
    private String id;
    private String conversationId;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String text;
    private String type = "text";
    private String fileUrl;
    private ReplyDto replyTo;
    private Map<String, List<String>> reactions; // emoji -> list of userIds
    private List<String> seenBy;
    private boolean isUnsent = false;
    private Long createdAt;

    public static class ReplyDto {
        private String id;
        private String senderId;
        private String senderName;
        private String text;

        public ReplyDto() {}
        public ReplyDto(String id, String senderId, String senderName, String text) {
            this.id = id;
            this.senderId = senderId;
            this.senderName = senderName;
            this.text = text;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getSenderId() { return senderId; }
        public void setSenderId(String senderId) { this.senderId = senderId; }
        public String getSenderName() { return senderName; }
        public void setSenderName(String senderName) { this.senderName = senderName; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
    }

    public ChatMessageDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getSenderAvatar() { return senderAvatar; }
    public void setSenderAvatar(String senderAvatar) { this.senderAvatar = senderAvatar; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public ReplyDto getReplyTo() { return replyTo; }
    public void setReplyTo(ReplyDto replyTo) { this.replyTo = replyTo; }

    public Map<String, List<String>> getReactions() { return reactions; }
    public void setReactions(Map<String, List<String>> reactions) { this.reactions = reactions; }

    public List<String> getSeenBy() { return seenBy; }
    public void setSeenBy(List<String> seenBy) { this.seenBy = seenBy; }

    public boolean isUnsent() { return isUnsent; }
    public void setUnsent(boolean unsent) { isUnsent = unsent; }

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}
