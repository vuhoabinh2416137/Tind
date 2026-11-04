package com.messenger.dto;

public class CreateConversationRequest {
    private String userA;
    private String userB;

    public CreateConversationRequest() {}
    public CreateConversationRequest(String userA, String userB) {
        this.userA = userA;
        this.userB = userB;
    }

    public String getUserA() { return userA; }
    public void setUserA(String userA) { this.userA = userA; }

    public String getUserB() { return userB; }
    public void setUserB(String userB) { this.userB = userB; }
}
