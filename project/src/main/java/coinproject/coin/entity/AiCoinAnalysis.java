package coinproject.coin.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_coin_analysis")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCoinAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String market; // 업비트 마켓 코드 (예: KRW-BTC)
    
    private Integer score; // AI 방향성 점수 (0:강한악재 ~ 100:강한호재)
    
    private String summary; // AI 요약 3줄 브리핑
    
    private String theme; // 업비트 기반 1차 테마 분류 (SAFE, HIGH_RISK, TRENDING 등)
    
    private LocalDateTime updatedAt; // 마지막 분석 시간
}
