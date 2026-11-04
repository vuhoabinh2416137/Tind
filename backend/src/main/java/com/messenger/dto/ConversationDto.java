package com.messenger.dto;

import java.util.List;

public class ConversationDto {
    private String id;
    private String type;
    private String name;
    private String avatar;
    private String theme;
    private String quickEmoji;
    private boolean online;
    private Long lastSeen;
    private boolean isBot;
    private ChatMessageDto lastMessage;
    private int unreadCount;
    private List<String> participants;

    public ConversationDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public String getQuickEmoji() { return quickEmoji; }
    public void setQuickEmoji(String quickEmoji) { this.quickEmoji = quickEmoji; }

    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }

    public Long getLastSeen() { return lastSeen; }
    public void setLastSeen(Long lastSeen) { this.lastSeen = lastSeen; }

    public boolean isBot() { return isBot; }
    public void setBot(boolean bot) { isBot = bot; }

    public ChatMessageDto getLastMessage() { return lastMessage; }
    public void setLastMessage(ChatMessageDto lastMessage) { this.lastMessage = lastMessage; }

    public int getUnreadCount() { return unreadCount; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }

    public List<String> getParticipants() { return participants; }
    public void setParticipants(List<String> participants) { this.participants = participants; }
}
