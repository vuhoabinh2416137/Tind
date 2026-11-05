package com.messenger.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    private Boolean emailVerified = false;

    @Column(nullable = false)
    private String name;

    @JsonIgnore
    private String password;

    @Column(length = 1000)
    private String avatar;

    private String status;

    private boolean online = false;

    private Long lastSeen = Instant.now().toEpochMilli();

    private boolean isBot = false;

    private Long createdAt = Instant.now().toEpochMilli();

    public User() {}

    public User(String id, String username, String name, String avatar, String status, boolean isBot) {
        this.id = id;
        this.username = username;
        this.name = name;
        this.avatar = avatar;
        this.status = status;
        this.isBot = isBot;
        this.online = isBot;
        this.lastSeen = Instant.now().toEpochMilli();
        this.createdAt = Instant.now().toEpochMilli();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isEmailVerified() { return Boolean.TRUE.equals(emailVerified); }
    public void setEmailVerified(Boolean emailVerified) { this.emailVerified = emailVerified; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }

    public Long getLastSeen() { return lastSeen; }
    public void setLastSeen(Long lastSeen) { this.lastSeen = lastSeen; }

    public boolean isBot() { return isBot; }
    public void setBot(boolean bot) { isBot = bot; }

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}
