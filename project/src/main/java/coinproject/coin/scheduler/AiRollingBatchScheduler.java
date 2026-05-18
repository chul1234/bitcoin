package coinproject.coin.scheduler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import coinproject.coin.entity.AiCoinAnalysis;
import coinproject.coin.repository.AiCoinAnalysisRepository;
import coinproject.coin.service.GeminiService;
import coinproject.coin.service.UpbitPriceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiRollingBatchScheduler {

    private final UpbitPriceService upbitPriceService;
    private final GeminiService geminiService;
    private final AiCoinAnalysisRepository aiCoinAnalysisRepository;
    private final ObjectMapper objectMapper;

    // 현재 처리할 청크(묶음)의 인덱스
    private int currentChunkIndex = 0;
    // 한 번에 처리할 코인 개수 (제미나이 3.1 토큰 한도를 넘지 않는 선에서 최대치인 40개로 늘림)
    private static final int CHUNK_SIZE = 40;

    @Scheduled(fixedDelay = 180000) // 3분(180초)마다 실행 (Gemini 3.1 RPD 한도 방어)
    @Transactional
    public void analyzeCoinsRollingBatch() {
        // 1. 전체 마켓 목록 가져오기
        List<String> allMarkets = upbitPriceService.getAllKrwMarkets();
        if (allMarkets.isEmpty()) {
            log.warn("업비트 마켓 목록을 가져오지 못했습니다.");
            return;
        }

        int totalSize = allMarkets.size();
        
        // 인덱스가 전체 크기를 넘어가면 다시 0으로 초기화 (순환)
        if (currentChunkIndex * CHUNK_SIZE >= totalSize) {
            currentChunkIndex = 0;
        }

        // 2. 이번 턴에 분석할 10개의 코인 자르기 (SubList)
        int startIndex = currentChunkIndex * CHUNK_SIZE;
        int endIndex = Math.min(startIndex + CHUNK_SIZE, totalSize);
        List<String> targetMarkets = allMarkets.subList(startIndex, endIndex);

        log.info("[AI Rolling Batch] {}/{} 사이클 시작. 타겟 코인: {}", 
                currentChunkIndex + 1, (int) Math.ceil((double) totalSize / CHUNK_SIZE), targetMarkets);

        // 3. 제미나이에게 던질 정교한 프롬프트(명령어) 작성
        String prompt = buildPrompt(targetMarkets);

        // 4. 제미나이 호출
        String jsonResponse = geminiService.askGemini(prompt);
        
        if (jsonResponse != null && !jsonResponse.isEmpty()) {
            try {
                // 마크다운 잔재(```json 등) 제거
                String cleanJson = jsonResponse.replaceAll("```json", "").replaceAll("```", "").trim();
                
                // 5. JSON 배열 파싱
                List<Map<String, Object>> results = objectMapper.readValue(cleanJson, new TypeReference<List<Map<String, Object>>>() {});
                
                // 6. DB 저장 로직 (업데이트 또는 인서트)
                for (Map<String, Object> result : results) {
                    String market = (String) result.get("market");
                    Integer score = (Integer) result.get("score");
                    String summary = (String) result.get("summary");
                    String theme = (String) result.get("theme");

                    if (market != null && score != null) {
                        AiCoinAnalysis analysis = aiCoinAnalysisRepository.findByMarket(market)
                                .orElse(AiCoinAnalysis.builder().market(market).build());
                        
                        analysis.setScore(score);
                        analysis.setSummary(summary);
                        analysis.setTheme(theme);
                        analysis.setUpdatedAt(LocalDateTime.now());
                        
                        aiCoinAnalysisRepository.save(analysis);
                    }
                }
                log.info("[AI Rolling Batch] {} 개 코인 분석 및 DB 저장 완료.", results.size());
                
                // 성공 시 다음 청크로 이동
                currentChunkIndex++;
            } catch (Exception e) {
                log.error("제미나이 응답 JSON 파싱 실패: {}", e.getMessage());
                // 파싱 실패해도 다음 코인으로 넘어가도록 인덱스 증가 (무한 루프 방지)
                currentChunkIndex++;
            }
        } else {
            log.warn("제미나이로부터 빈 응답을 받았습니다.");
            // 실패해도 인덱스 증가 (무한 루프 방지)
            currentChunkIndex++;
        }
    }

    private String buildPrompt(List<String> markets) {
        String coins = String.join(", ", markets);
        return "너는 가상화폐 시장 전문 AI 애널리스트야. " +
               "다음 " + markets.size() + "개의 코인에 대한 최신 글로벌 뉴스와 시장 심리를 분석해줘: " + coins + "\n\n" +
               "결과는 무조건 아래 JSON 배열 포맷으로만 응답해야 해. 다른 부연 설명이나 텍스트는 절대 넣지마.\n" +
               "[\n" +
               "  {\n" +
               "    \"market\": \"코인 티커(예: KRW-BTC)\",\n" +
               "    \"score\": 0~100 사이의 방향성 점수 (0: 초강력 악재/폭락 예상, 50: 중립, 100: 초강력 호재/폭등 예상),\n" +
               "    \"summary\": \"분석에 대한 3줄짜리 한국어 핵심 요약\",\n" +
               "    \"theme\": \"이 코인의 성격에 따라 SAFE, HIGH_RISK, TRENDING 중 하나만 입력\"\n" +
               "  }\n" +
               "]\n\n" +
               "반드시 위 포맷을 지킨 JSON 배열(`[...]`) 텍스트만 출력해.";
    }
}
