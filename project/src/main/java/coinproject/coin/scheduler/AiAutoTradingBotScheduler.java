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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component

public class AiAutoTradingBotScheduler {

    private static final Logger log = LoggerFactory.getLogger(AiAutoTradingBotScheduler.class);

    private final UserAiConfigRepository userAiConfigRepository;
    private final AiCoinAnalysisRepository aiCoinAnalysisRepository;
    private final UserAssetRepository userAssetRepository;
    private final OrderService orderService;
    private final UpbitPriceService upbitPriceService;
    private final coinproject.coin.repository.OrderRepository orderRepository;

    public AiAutoTradingBotScheduler(UserAiConfigRepository userAiConfigRepository,
                                     AiCoinAnalysisRepository aiCoinAnalysisRepository,
                                     UserAssetRepository userAssetRepository,
                                     OrderService orderService,
                                     UpbitPriceService upbitPriceService,
                                     coinproject.coin.repository.OrderRepository orderRepository) {
        this.userAiConfigRepository = userAiConfigRepository;
        this.aiCoinAnalysisRepository = aiCoinAnalysisRepository;
        this.userAssetRepository = userAssetRepository;
        this.orderService = orderService;
        this.upbitPriceService = upbitPriceService;
        this.orderRepository = orderRepository;
    }

    // 1회 매수 예산 (임시로 100만원 고정, 추후 설정으로 뺄 수 있음)
    private static final BigDecimal BUDGET_PER_TRADE = new BigDecimal("1000000");
    // 최소 주문 금액 (업비트 기준 보통 5000원)
    private static final BigDecimal MIN_ORDER_KRW = new BigDecimal("5000");

    @Scheduled(fixedRate = 10000) // 10초 주기 (안정적인 API 호출을 위함)
    @org.springframework.transaction.annotation.Transactional
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
        if (theme == null) return;
        
        // --- 테마별 파라미터 세팅 ---
        BigDecimal buyRatio = new BigDecimal("0.10"); // 첫 매수 비중
        BigDecimal reBuyRatio = new BigDecimal("0.03"); // 추가 매수 비중 (기본 3%)
        int maxBuys = 3;
        int cooldownMins = 30;
        int minScoreToBuy = 70;
        BigDecimal takeProfit = new BigDecimal("5.0");
        BigDecimal stopLoss = new BigDecimal("-3.0");

        switch (theme) {
            case "VALUE":
                buyRatio = new BigDecimal("0.20"); reBuyRatio = new BigDecimal("0.05");
                maxBuys = 4; cooldownMins = 40; minScoreToBuy = 65;
                takeProfit = new BigDecimal("15.0"); stopLoss = new BigDecimal("-8.0");
                break;
            case "HIGH_RISK":
                buyRatio = new BigDecimal("0.25"); reBuyRatio = new BigDecimal("0.05");
                maxBuys = 5; cooldownMins = 10; minScoreToBuy = 60;
                takeProfit = new BigDecimal("20.0"); stopLoss = new BigDecimal("-10.0");
                break;
            case "TRENDING":
                buyRatio = new BigDecimal("0.15"); reBuyRatio = new BigDecimal("0.04");
                maxBuys = 4; cooldownMins = 20; minScoreToBuy = 65;
                takeProfit = new BigDecimal("10.0"); stopLoss = new BigDecimal("-5.0");
                break;
            case "SAFE":
                buyRatio = new BigDecimal("0.10"); reBuyRatio = new BigDecimal("0.02");
                maxBuys = 3; cooldownMins = 30; minScoreToBuy = 70;
                takeProfit = new BigDecimal("5.0"); stopLoss = new BigDecimal("-3.0");
                break;
        }

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
            if (avgBuyPrice == null || avgBuyPrice.compareTo(BigDecimal.ZERO) <= 0) continue;
            
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

            if (profitRatio.compareTo(takeProfit) >= 0) {
                shouldSell = true;
                sellReason = "+" + takeProfit + "% 수익률 도달 (테마 맞춤 익절)";
            } else if (profitRatio.compareTo(stopLoss) <= 0) {
                shouldSell = true;
                sellReason = stopLoss + "% 손실 한도 도달 (테마 맞춤 손절)";
            } else if (currentScore < 45) {
                shouldSell = true;
                sellReason = "AI 강력 악재 감지 (선제 방어 손절)";
            } else if (profitRatio.compareTo(new BigDecimal("2.0")) >= 0 && currentScore < 50) {
                shouldSell = true;
                sellReason = "상승 동력 하락 감지 (스마트 선제 익절)";
            }

            if (shouldSell) {
                log.info("🤖 [매도 실행] 유저: {}, 테마: {}, 마켓: {}, 사유: {}", user.getUserId(), theme, market, sellReason);
                // 전량 시장가 매도
                orderService.sellOrder(user.getUserId(), market, currentPrice, asset.getBalance(), "MARKET", null);
            }
        }

        // 3. [기회 포착 - 매수 로직 (물타기/불타기 지원)]
        List<AiCoinAnalysis> topCoins = aiCoinAnalysisRepository.findByThemeOrderByScoreDesc(theme);
        if (topCoins.isEmpty()) return;

        int limit = Math.min(3, topCoins.size());
        
        // 업비트 API Rate Limit (초당 10회) 방지를 위해 한 번에 가격 조회
        java.util.Set<String> targetMarketsToFetch = new java.util.HashSet<>();
        for (int i = 0; i < limit; i++) {
            if (topCoins.get(i).getScore() != null && topCoins.get(i).getScore() >= minScoreToBuy) {
                targetMarketsToFetch.add(topCoins.get(i).getMarket());
            }
        }
        
        Map<String, BigDecimal> currentPrices = targetMarketsToFetch.isEmpty() ? java.util.Collections.emptyMap() : upbitPriceService.getCurrentPrices(targetMarketsToFetch);

        for (int i = 0; i < limit; i++) {
            AiCoinAnalysis topCoin = topCoins.get(i);
            
            if (topCoin.getScore() != null && topCoin.getScore() >= minScoreToBuy) {
                String targetMarket = topCoin.getMarket();
                String targetCurrency = targetMarket.split("-")[1];

                boolean alreadyOwns = assets.stream()
                        .anyMatch(a -> targetCurrency.equals(a.getCurrency()) && a.getBalance().compareTo(BigDecimal.ZERO) > 0);

                boolean canBuy = true;
                BigDecimal actualRatioToUse = buyRatio;

                if (alreadyOwns) {
                    actualRatioToUse = reBuyRatio; // 이미 보유 중이면 '추가 매수 비중(1~5%)' 사용
                    long buyCount = orderRepository.countByUserAndMarketAndSide(user, targetMarket, "BUY");
                    if (buyCount >= maxBuys) {
                        canBuy = false;
                    } else {
                        Optional<coinproject.coin.entity.Order> lastOrderOpt = orderRepository.findFirstByUserAndMarketAndSideOrderByCreatedAtDesc(user, targetMarket, "BUY");
                        if (lastOrderOpt.isPresent()) {
                            java.time.Duration duration = java.time.Duration.between(lastOrderOpt.get().getCreatedAt(), java.time.LocalDateTime.now());
                            if (duration.toMinutes() < cooldownMins) {
                                canBuy = false;
                            }
                        }
                    }
                }

                if (canBuy) {
                    BigDecimal availableKrw = krwAsset.getBalance();
                    BigDecimal budgetToUse = availableKrw.multiply(actualRatioToUse);

                    if (budgetToUse.compareTo(MIN_ORDER_KRW) >= 0) {
                        BigDecimal currentPrice = currentPrices.get(targetMarket);
                        
                        if (currentPrice != null) {
                            BigDecimal feeRate = new BigDecimal("1.0005");
                            BigDecimal maxCostWithoutFee = budgetToUse.divide(feeRate, 8, RoundingMode.DOWN);
                            BigDecimal volumeToBuy = maxCostWithoutFee.divide(currentPrice, 8, RoundingMode.DOWN);

                            String reasonMsg = alreadyOwns ? "추가 매수 (불타기/물타기)" : "신규 포착 매수";
                            log.info("🤖 [매수 실행] 유저: {}, 테마: {}, 마켓: {}, 사유: {} (점수: {})", user.getUserId(), theme, targetMarket, reasonMsg, topCoin.getScore());
                            orderService.buyOrder(user.getUserId(), targetMarket, currentPrice, volumeToBuy, "MARKET", null);
                        }
                    }
                }
            }
        }
    }
}
