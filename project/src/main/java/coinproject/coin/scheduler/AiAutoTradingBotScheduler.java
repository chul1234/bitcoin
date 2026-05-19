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

            // 조건 1: +5% 이상 수익 시 즉시 익절 (Take Profit)
            if (profitRatio.compareTo(new BigDecimal("5.0")) >= 0) {
                shouldSell = true;
                sellReason = "+5% 수익률 도달 (익절)";
            }
            // 조건 2: AI 점수 40점 미만 하락 시 전량 손절 (Stop Loss)
            else if (currentScore < 40) {
                shouldSell = true;
                sellReason = "AI 악재 감지 (점수 40점 미만, 손절 방어)";
            }

            if (shouldSell) {
                log.info("🤖 [매도 실행] 유저: {}, 마켓: {}, 사유: {}", user.getUserId(), market, sellReason);
                // 전량 시장가 매도
                orderService.sellOrder(user.getUserId(), market, currentPrice, asset.getBalance(), "MARKET", null);
            }
        }

        // 3. [기회 포착 - 매수 로직]
        // 해당 테마의 1등 코인 가져오기
        List<AiCoinAnalysis> topCoins = aiCoinAnalysisRepository.findByThemeOrderByScoreDesc(theme);
        if (topCoins.isEmpty()) return;

        AiCoinAnalysis topCoin = topCoins.get(0);
        
        // 1등 코인 점수가 70점 이상일 때만 매수
        if (topCoin.getScore() >= 70) {
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

                        log.info("🤖 [매수 실행] 유저: {}, 테마: {}, 마켓: {}, 사유: 1등 코인 포착 (점수: {})", user.getUserId(), theme, targetMarket, topCoin.getScore());
                        orderService.buyOrder(user.getUserId(), targetMarket, currentPrice, volumeToBuy, "MARKET", null);
                    }
                }
            }
        }
    }
}
