package coinproject.coin.controller;

import coinproject.coin.entity.AiCoinAnalysis;
import coinproject.coin.repository.AiCoinAnalysisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiCoinAnalysisRepository aiCoinAnalysisRepository;

    /**
     * 특정 테마(SAFE, HIGH_RISK, TRENDING)의 AI 분석 결과를 점수(Score) 내림차순으로 3개 가져옵니다.
     */
    @GetMapping("/recommendations")
    public ResponseEntity<List<AiCoinAnalysis>> getRecommendations(@RequestParam(defaultValue = "SAFE") String theme) {
        // 테마에 맞는 코인을 점수가 높은 순으로 가져옵니다.
        List<AiCoinAnalysis> topCoins = aiCoinAnalysisRepository.findByThemeOrderByScoreDesc(theme);
        
        // 최대 3개까지만 리턴
        if (topCoins.size() > 3) {
            topCoins = topCoins.subList(0, 3);
        }
        
        return ResponseEntity.ok(topCoins);
    }

    /**
     * 특정 마켓의 최신 AI 방향성 점수와 분석 결과를 가져옵니다. (예측 차트 그리기용)
     */
    @GetMapping("/score")
    public ResponseEntity<AiCoinAnalysis> getScore(@RequestParam String market) {
        return aiCoinAnalysisRepository.findByMarket(market)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
