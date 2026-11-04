package com.messenger.dto;

public class ThemeUpdateDto {
    private String theme;
    private String quickEmoji;

    public ThemeUpdateDto() {}

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public String getQuickEmoji() { return quickEmoji; }
    public void setQuickEmoji(String quickEmoji) { this.quickEmoji = quickEmoji; }
}
