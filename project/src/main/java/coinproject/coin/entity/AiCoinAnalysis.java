package coinproject.coin.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_coin_analysis")
public class AiCoinAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String market; // 업비트 마켓 코드 (예: KRW-BTC)
    
    private Integer score; // AI 방향성 점수 (0:강한악재 ~ 100:강한호재)
    
    private String summary; // AI 요약 3줄 브리핑
    
    private String theme; // 업비트 기반 1차 테마 분류 (SAFE, HIGH_RISK, TRENDING 등)
    
    private LocalDateTime updatedAt; // 마지막 분석 시간

    public AiCoinAnalysis() {}

    public AiCoinAnalysis(Long id, String market, Integer score, String summary, String theme, LocalDateTime updatedAt) {
        this.id = id;
        this.market = market;
        this.score = score;
        this.summary = summary;
        this.theme = theme;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMarket() { return market; }
    public void setMarket(String market) { this.market = market; }

    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static AiCoinAnalysisBuilder builder() {
        return new AiCoinAnalysisBuilder();
    }

    public static class AiCoinAnalysisBuilder {
        private Long id;
        private String market;
        private Integer score;
        private String summary;
        private String theme;
        private LocalDateTime updatedAt;

        public AiCoinAnalysisBuilder id(Long id) { this.id = id; return this; }
        public AiCoinAnalysisBuilder market(String market) { this.market = market; return this; }
        public AiCoinAnalysisBuilder score(Integer score) { this.score = score; return this; }
        public AiCoinAnalysisBuilder summary(String summary) { this.summary = summary; return this; }
        public AiCoinAnalysisBuilder theme(String theme) { this.theme = theme; return this; }
        public AiCoinAnalysisBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public AiCoinAnalysis build() {
            return new AiCoinAnalysis(id, market, score, summary, theme, updatedAt);
        }
    }
}
