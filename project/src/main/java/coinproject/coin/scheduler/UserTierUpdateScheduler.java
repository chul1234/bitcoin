package coinproject.coin.scheduler;

import coinproject.coin.entity.User;
import coinproject.coin.entity.UserAsset;
import coinproject.coin.repository.UserAssetRepository;
import coinproject.coin.repository.UserRepository;
import coinproject.coin.service.UpbitPriceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class UserTierUpdateScheduler {

    private static final Logger log = LoggerFactory.getLogger(UserTierUpdateScheduler.class);

    private final UserRepository userRepository;
    private final UserAssetRepository userAssetRepository;
    private final UpbitPriceService upbitPriceService;

    public UserTierUpdateScheduler(UserRepository userRepository,
                                   UserAssetRepository userAssetRepository,
                                   UpbitPriceService upbitPriceService) {
        this.userRepository = userRepository;
        this.userAssetRepository = userAssetRepository;
        this.upbitPriceService = upbitPriceService;
    }

    private static final BigDecimal INITIAL_SEED_MONEY = new BigDecimal("10000000");

    @Scheduled(fixedDelay = 60000) // 1분마다 실행
    @Transactional
    public void updateUserTiers() {
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) return;

        for (User user : users) {
            try {
                // 관리자는 업데이트 패스
                if ("admin".equals(user.getUserId())) {
                    user.setTier("DIAMOND");
                    continue;
                }

                List<UserAsset> assets = userAssetRepository.findByUser(user);
                BigDecimal totalNetWorth = BigDecimal.ZERO;

                // 1. 보유 중인 코인 마켓 목록 추출
                Set<String> markets = assets.stream()
                        .filter(a -> !"KRW".equals(a.getCurrency()) && a.getBalance().compareTo(BigDecimal.ZERO) > 0)
                        .map(a -> "KRW-" + a.getCurrency())
                        .collect(Collectors.toSet());

                // 2. 실시간 시세 조회
                Map<String, BigDecimal> currentPrices = markets.isEmpty() ? java.util.Collections.emptyMap() : upbitPriceService.getCurrentPrices(markets);

                // 3. 총 자산 계산 (KRW + 코인 현재가치)
                for (UserAsset asset : assets) {
                    if ("KRW".equals(asset.getCurrency())) {
                        totalNetWorth = totalNetWorth.add(asset.getBalance());
                    } else {
                        String market = "KRW-" + asset.getCurrency();
                        BigDecimal currentPrice = currentPrices.getOrDefault(market, BigDecimal.ZERO);
                        BigDecimal coinValue = asset.getBalance().multiply(currentPrice);
                        totalNetWorth = totalNetWorth.add(coinValue);
                    }
                }

                // 4. 수익률 계산 ((총자산 - 1000만) / 1000만 * 100)
                BigDecimal profitDiff = totalNetWorth.subtract(INITIAL_SEED_MONEY);
                BigDecimal profitRate = profitDiff.divide(INITIAL_SEED_MONEY, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));

                // 5. 티어 결정
                String newTier = "BRONZE";
                if (profitRate.compareTo(new BigDecimal("300")) >= 0) {
                    newTier = "DIAMOND";
                } else if (profitRate.compareTo(new BigDecimal("100")) >= 0) {
                    newTier = "PLATINUM";
                } else if (profitRate.compareTo(new BigDecimal("50")) >= 0) {
                    newTier = "GOLD";
                } else if (profitRate.compareTo(new BigDecimal("10")) >= 0) {
                    newTier = "SILVER";
                }

                // 6. 업데이트 반영
                user.setCumulativeProfitRate(profitRate);
                user.setTier(newTier);
                
                // 영속성 컨텍스트에 의해 자동 업데이트 됨 (Transactional)

            } catch (Exception e) {
                log.error("유저 {} 티어 업데이트 중 오류: {}", user.getUserId(), e.getMessage());
            }
        }
        // log.info("[Tier Scheduler] 모든 유저의 수익률 및 티어 업데이트 완료.");
    }
}
