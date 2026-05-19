package coinproject.coin.scheduler;

import coinproject.coin.entity.AiCoinAnalysis;
import coinproject.coin.entity.User;
import coinproject.coin.entity.UserAiConfig;
import coinproject.coin.entity.UserAsset;
import coinproject.coin.repository.AiCoinAnalysisRepository;
import coinproject.coin.repository.UserAiConfigRepository;
import coinproject.coin.repository.UserAssetRepository;
import coinproject.coin.service.OrderService;
import coinproject.coin.service.UpbitPriceService;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component

public class AiAutoTradingBotScheduler {

    private final UserAiConfigRepository userAiConfigRepository;
    private final AiCoinAnalysisRepository aiCoinAnalysisRepository;
    private final UserAssetRepository userAssetRepository;
    private final OrderService orderService;
    private final UpbitPriceService upbitPriceService;

    public AiAutoTradingBotScheduler(UserAiConfigRepository userAiConfigRepository,
                                     AiCoinAnalysisRepository aiCoinAnalysisRepository,
                                     UserAssetRepository userAssetRepository,
                                     OrderService orderService,
                                     UpbitPriceService upbitPriceService) {
        this.userAiConfigRepository = userAiConfigRepository;
        this.aiCoinAnalysisRepository = aiCoinAnalysisRepository;
        this.userAssetRepository = userAssetRepository;
        this.orderService = orderService;
        this.upbitPriceService = upbitPriceService;
    }

    // 1회 매수 예산 (임시로 100만원 고정, 추후 설정으로 뺄 수 있음)
    private static final BigDecimal BUDGET_PER_TRADE = new BigDecimal("1000000");
    // 최소 주문 금액 (업비트 기준 보통 5000원)
    private static final BigDecimal MIN_ORDER_KRW = new BigDecimal("5000");

    @Scheduled(fixedRate = 5000) // 5초 주기 (빠른 테스트용)
    public void runAutoTradingBots() {
        List<UserAiConfig> activeConfigs = userAiConfigRepository.findByIsActiveTrue();
        if (activeConfigs.isEmpty()) {
            return;
        }

        log.info("🤖 AI 24시간 자동매매 봇 가동 시작... (활성화 유저: {}명)", activeConfigs.size());

        for (UserAiConfig config : activeConfigs) {
            try {
                processBotForUser(config);
            } catch (Exception e) {
                log.error("유저 {} 봇 처리 중 오류: {}", config.getUser().getUserId(), e.getMessage());
            }
        }
    }

    private void processBotForUser(UserAiConfig config) {
        User user = config.getUser();
        String theme = config.getTradeTheme();
        
        // 1. 유저 보유 자산 조회
        List<UserAsset> assets = userAssetRepository.findByUser(user);
        UserAsset krwAsset = assets.stream().filter(a -> "KRW".equals(a.getCurrency())).findFirst().orElse(null);
        if (krwAsset == null) return;

        // 2. [리스크 관리 - 매도 로직]
        for (UserAsset asset : assets) {
            if ("KRW".equals(asset.getCurrency()) || asset.getBalance().compareTo(BigDecimal.ZERO) <= 0) continue;

            String market = "KRW-" + asset.getCurrency();
            
            // 현재가 조회
            Map<String, BigDecimal> priceMap = upbitPriceService.getCurrentPrices(Collections.singleton(market));
            BigDecimal currentPrice = priceMap.get(market);
            if (currentPrice == null) continue;

            // 수익률 계산
            BigDecimal avgBuyPrice = asset.getAvgBuyPrice();
            if (avgBuyPrice.compareTo(BigDecimal.ZERO) <= 0) continue;
            
            BigDecimal profitRatio = currentPrice.subtract(avgBuyPrice)
                    .divide(avgBuyPrice, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));

            // 최신 AI 점수 조회
            int currentScore = 50; // 기본값
            Optional<AiCoinAnalysis> analysisOpt = aiCoinAnalysisRepository.findByMarket(market);
            if (analysisOpt.isPresent()) {
                currentScore = analysisOpt.get().getScore();
            }

            boolean shouldSell = false;
            String sellReason = "";

            // 조건 1: +10% 이상 수익 시 대박 익절 (Take Profit)
            if (profitRatio.compareTo(new BigDecimal("10.0")) >= 0) {
                shouldSell = true;
                sellReason = "+10% 수익률 돌파 (강력 익절 실현)";
            }
            // 조건 2: +3% 이상 수익 중인데 AI 점수가 60점 미만으로 꺾일 때 스마트 익절
            else if (profitRatio.compareTo(new BigDecimal("3.0")) >= 0 && currentScore < 60) {
                shouldSell = true;
                sellReason = "상승 동력 하락 감지 (스마트 선제 익절)";
            }
            // 조건 3: -7% 이하 하락 시 칼손절
            else if (profitRatio.compareTo(new BigDecimal("-7.0")) <= 0) {
                shouldSell = true;
                sellReason = "-7% 손실 한도 도달 (하락 방어 손절)";
            }
            // 조건 4: AI 점수가 45점 미만으로 폭락 시 선제 손절
            else if (currentScore < 45) {
                shouldSell = true;
                sellReason = "AI 강력 악재 감지 (선제 방어 손절)";
            }

            if (shouldSell) {
                log.info("🤖 [매도 실행] 유저: {}, 마켓: {}, 사유: {}", user.getUserId(), market, sellReason);
                // 전량 시장가 매도
                orderService.sellOrder(user.getUserId(), market, currentPrice, asset.getBalance(), "MARKET", null);
            }
        }

        // 3. [기회 포착 - 매수 로직]
        // 해당 테마의 코인 가져오기 (점수 내림차순)
        List<AiCoinAnalysis> topCoins = aiCoinAnalysisRepository.findByThemeOrderByScoreDesc(theme);
        if (topCoins.isEmpty()) return;

        // Top 3 까지만 순회하여 분산 매수
        int limit = Math.min(3, topCoins.size());
        for (int i = 0; i < limit; i++) {
            AiCoinAnalysis topCoin = topCoins.get(i);
            
            // 1~3등 코인 중 AI 점수가 65점 이상일 때만 매수
            if (topCoin.getScore() >= 65) {
                String targetMarket = topCoin.getMarket();
                String targetCurrency = targetMarket.split("-")[1];

                // 내가 이 코인을 이미 들고 있는지 확인
                boolean alreadyOwns = assets.stream()
                        .anyMatch(a -> targetCurrency.equals(a.getCurrency()) && a.getBalance().compareTo(BigDecimal.ZERO) > 0);

                if (!alreadyOwns) {
                    // 매수할 예산 계산 (KRW 잔고와 BUDGET_PER_TRADE 중 작은 값)
                    BigDecimal availableKrw = krwAsset.getBalance();
                    BigDecimal budgetToUse = availableKrw.min(BUDGET_PER_TRADE);

                    if (budgetToUse.compareTo(MIN_ORDER_KRW) >= 0) {
                        Map<String, BigDecimal> priceMap = upbitPriceService.getCurrentPrices(Collections.singleton(targetMarket));
                        BigDecimal currentPrice = priceMap.get(targetMarket);
                        
                        if (currentPrice != null) {
                            // 수수료 0.05% 감안하여 살 수 있는 볼륨 계산
                            BigDecimal feeRate = new BigDecimal("1.0005");
                            BigDecimal maxCostWithoutFee = budgetToUse.divide(feeRate, 8, RoundingMode.DOWN);
                            BigDecimal volumeToBuy = maxCostWithoutFee.divide(currentPrice, 8, RoundingMode.DOWN);

                            log.info("🤖 [매수 실행] 유저: {}, 테마: {}, 순위: {}등, 마켓: {}, 사유: 유망 코인 포착 (점수: {})", user.getUserId(), theme, (i+1), targetMarket, topCoin.getScore());
                            orderService.buyOrder(user.getUserId(), targetMarket, currentPrice, volumeToBuy, "MARKET", null);
                            
                            // 매수 후 KRW 잔고 차감 (동일 루프 내 다음 코인 예산 산정을 위함)
                            krwAsset.setBalance(krwAsset.getBalance().subtract(budgetToUse));
                        }
                    }
                }
            }
        }
    }
}
