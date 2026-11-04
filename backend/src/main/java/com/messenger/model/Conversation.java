package com.messenger.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    private String id;

    private String type = "direct"; // direct, group

    private String name;

    @Column(length = 1000)
    private String avatar;

    private String theme = "#0084FF";

    private String quickEmoji = "👍";

    private Long createdAt = Instant.now().toEpochMilli();

    private Long updatedAt = Instant.now().toEpochMilli();

    public Conversation() {}

    public Conversation(String id, String type, String theme, String quickEmoji) {
        this.id = id;
        this.type = type;
        this.theme = theme;
        this.quickEmoji = quickEmoji;
        this.createdAt = Instant.now().toEpochMilli();
        this.updatedAt = Instant.now().toEpochMilli();
    }

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

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }

    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
