package com.messenger.dto;

public class SeenDto {
    private String conversationId;
    private String userId;
    private String userAvatar;
    private String userName;

    public SeenDto() {}
    public SeenDto(String conversationId, String userId, String userAvatar, String userName) {
        this.conversationId = conversationId;
        this.userId = userId;
        this.userAvatar = userAvatar;
        this.userName = userName;
    }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserAvatar() { return userAvatar; }
    public void setUserAvatar(String userAvatar) { this.userAvatar = userAvatar; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
}
