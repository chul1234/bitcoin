package coinproject.coin.repository;

import coinproject.coin.entity.AiCoinAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiCoinAnalysisRepository extends JpaRepository<AiCoinAnalysis, Long> {

    // 특정 마켓(코인)의 최신 AI 분석 결과 조회 (예상 차트 그리기용)
    Optional<AiCoinAnalysis> findByMarket(String market);

    // 특정 테마에 속하는 코인들을 점수 높은 순으로 가져오기 (AI 추천 팝업용)
    List<AiCoinAnalysis> findByThemeOrderByScoreDesc(String theme);
}
