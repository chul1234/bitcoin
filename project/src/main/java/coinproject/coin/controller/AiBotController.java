package coinproject.coin.controller;

// IDE 강제 새로고침용 주석입니다. (무시하셔도 됩니다)

import coinproject.coin.entity.User;
import coinproject.coin.entity.UserAiConfig;
import coinproject.coin.repository.UserAiConfigRepository;
import coinproject.coin.repository.UserRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import coinproject.coin.entity.UserAsset;
import coinproject.coin.entity.AiCoinAnalysis;
import coinproject.coin.repository.UserAssetRepository;
import coinproject.coin.repository.AiCoinAnalysisRepository;
import coinproject.coin.service.OrderService;
import coinproject.coin.service.UpbitPriceService;

@RestController
@RequestMapping("/api/ai/bot")

public class AiBotController {

    private final UserAiConfigRepository userAiConfigRepository;
    private final UserRepository userRepository;
    private final UserAssetRepository userAssetRepository;
    private final AiCoinAnalysisRepository aiCoinAnalysisRepository;
    private final OrderService orderService;
    private final UpbitPriceService upbitPriceService;

    public AiBotController(UserAiConfigRepository userAiConfigRepository, 
                           UserRepository userRepository,
                           UserAssetRepository userAssetRepository,
                           AiCoinAnalysisRepository aiCoinAnalysisRepository,
                           OrderService orderService,
                           UpbitPriceService upbitPriceService) {
        this.userAiConfigRepository = userAiConfigRepository;
        this.userRepository = userRepository;
        this.userAssetRepository = userAssetRepository;
        this.aiCoinAnalysisRepository = aiCoinAnalysisRepository;
        this.orderService = orderService;
        this.upbitPriceService = upbitPriceService;
    }

    @GetMapping("/config")
    public ResponseEntity<?> getBotConfig(@RequestHeader("X-User-Id") String userId) {
        Optional<User> userOpt = userRepository.findByUserId(userId);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body("User not found");
            
        Optional<UserAiConfig> configOpt = userAiConfigRepository.findByUser(userOpt.get());
        Map<String, Object> result = new HashMap<>();
        
        if (configOpt.isPresent()) {
            UserAiConfig config = configOpt.get();
            result.put("isActive", config.isActive());
            result.put("tradeTheme", config.getTradeTheme());
        } else {
            result.put("isActive", false);
            result.put("tradeTheme", null);
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/toggle")
    public ResponseEntity<?> toggleBot(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, Object> payload) {
        
        Optional<User> userOpt = userRepository.findByUserId(userId);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body("User not found");

        String theme = (String) payload.get("theme");
        boolean wantToActivate = (boolean) payload.get("activate");

        User user = userOpt.get();
        UserAiConfig config = userAiConfigRepository.findByUser(user)
                .orElse(UserAiConfig.builder().user(user).build());

        config.setActive(wantToActivate);
        if (wantToActivate) {
            config.setTradeTheme(theme);
        } else {
            // 끄는 거면 테마 유지는 하거나 초기화. 일단 놔둠.
        }

        userAiConfigRepository.save(config);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("isActive", config.isActive());
        result.put("tradeTheme", config.getTradeTheme());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/test-run")
    public ResponseEntity<String> testRunBots() {
        StringBuilder log = new StringBuilder();
        log.append("=== AI BOT TEST RUN ===\n");
        
        List<UserAiConfig> activeConfigs = userAiConfigRepository.findByIsActiveTrue();
        log.append("Active configs found: ").append(activeConfigs.size()).append("\n");
        
        if (activeConfigs.isEmpty()) {
            return ResponseEntity.ok(log.toString());
        }

        for (UserAiConfig config : activeConfigs) {
            log.append("\nProcessing User: ").append(config.getUser().getUserId()).append("\n");
            try {
                User user = config.getUser();
                String theme = config.getTradeTheme();
                log.append("Theme: ").append(theme).append("\n");
                
                List<UserAsset> assets = userAssetRepository.findByUser(user);
                UserAsset krwAsset = assets.stream().filter(a -> "KRW".equals(a.getCurrency())).findFirst().orElse(null);
                
                if (krwAsset == null) {
                    log.append("KRW Asset is null! Bailing out.\n");
                    continue;
                }
                log.append("KRW Balance: ").append(krwAsset.getBalance()).append("\n");

                List<AiCoinAnalysis> topCoins = aiCoinAnalysisRepository.findByThemeOrderByScoreDesc(theme);
                if (topCoins.isEmpty()) {
                    log.append("No top coins found for theme ").append(theme).append("\n");
                    continue;
                }

                int limit = Math.min(3, topCoins.size());
                for (int i = 0; i < limit; i++) {
                    AiCoinAnalysis topCoin = topCoins.get(i);
                    log.append("Top Coin [").append(i+1).append("]: ").append(topCoin.getMarket()).append(" (Score: ").append(topCoin.getScore()).append(")\n");
                    
                    if (topCoin.getScore() >= 65) {
                        String targetMarket = topCoin.getMarket();
                        String targetCurrency = targetMarket.split("-")[1];
                        
                        boolean alreadyOwns = assets.stream()
                                .anyMatch(a -> targetCurrency.equals(a.getCurrency()) && a.getBalance().compareTo(BigDecimal.ZERO) > 0);
                                
                        log.append("Already owns ").append(targetCurrency).append("? ").append(alreadyOwns).append("\n");
                        
                        if (!alreadyOwns) {
                            BigDecimal availableKrw = krwAsset.getBalance();
                            BigDecimal budgetToUse = availableKrw.min(new BigDecimal("1000000"));
                            log.append("Budget to use: ").append(budgetToUse).append("\n");
                            
                            if (budgetToUse.compareTo(new BigDecimal("5000")) >= 0) {
                                Map<String, BigDecimal> priceMap = upbitPriceService.getCurrentPrices(Collections.singleton(targetMarket));
                                BigDecimal currentPrice = priceMap.get(targetMarket);
                                log.append("Current Price from Upbit: ").append(currentPrice).append("\n");
                                
                                if (currentPrice != null) {
                                    BigDecimal feeRate = new BigDecimal("1.0005");
                                    BigDecimal maxCostWithoutFee = budgetToUse.divide(feeRate, 8, RoundingMode.DOWN);
                                    BigDecimal volumeToBuy = maxCostWithoutFee.divide(currentPrice, 8, RoundingMode.DOWN);
                                    
                                    log.append("Volume to buy: ").append(volumeToBuy).append("\n");
                                    log.append("EXECUTING BUY ORDER...\n");
                                    orderService.buyOrder(user.getUserId(), targetMarket, currentPrice, volumeToBuy, "MARKET", null);
                                    log.append("BUY ORDER EXECUTED!\n");
                                } else {
                                    log.append("Current price is null!\n");
                                }
                            } else {
                                log.append("Budget is less than 5000 KRW.\n");
                            }
                        }
                    } else {
                        log.append("Score < 65. Will not buy.\n");
                    }
                }
            } catch (Exception e) {
                log.append("EXCEPTION: ").append(e.getMessage()).append("\n");
                for (StackTraceElement element : e.getStackTrace()) {
                    log.append(element.toString()).append("\n");
                }
            }
        }
        
        return ResponseEntity.ok(log.toString());
    }
}
