package coinproject.coin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_ai_configs")
public class UserAiConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 봇 가동 여부
    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    // 대상 테마 (SAFE, HIGH_RISK, VALUE, TRENDING)
    @Column(name = "trade_theme")
    private String tradeTheme;

    // 대상 유저
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public UserAiConfig() {}

    public UserAiConfig(Long id, boolean isActive, String tradeTheme, User user, LocalDateTime createdAt) {
        this.id = id;
        this.isActive = isActive;
        this.tradeTheme = tradeTheme;
        this.user = user;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public String getTradeTheme() { return tradeTheme; }
    public void setTradeTheme(String tradeTheme) { this.tradeTheme = tradeTheme; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public static UserAiConfigBuilder builder() {
        return new UserAiConfigBuilder();
    }

    public static class UserAiConfigBuilder {
        private Long id;
        private boolean isActive;
        private String tradeTheme;
        private User user;
        private LocalDateTime createdAt;

        public UserAiConfigBuilder id(Long id) { this.id = id; return this; }
        public UserAiConfigBuilder isActive(boolean isActive) { this.isActive = isActive; return this; }
        public UserAiConfigBuilder tradeTheme(String tradeTheme) { this.tradeTheme = tradeTheme; return this; }
        public UserAiConfigBuilder user(User user) { this.user = user; return this; }
        public UserAiConfigBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public UserAiConfig build() {
            return new UserAiConfig(id, isActive, tradeTheme, user, createdAt);
        }
    }
}
