package coinproject.coin.service;

import coinproject.coin.entity.Order;
import coinproject.coin.entity.User;
import coinproject.coin.entity.UserAsset;
import coinproject.coin.repository.OrderRepository;
import coinproject.coin.repository.UserAssetRepository;
import coinproject.coin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final UserRepository userRepository;
    private final UserAssetRepository userAssetRepository;
    private final OrderRepository orderRepository;

    /**
     * 지정가 매수 처리 (모의투자이므로 즉시 체결로 간주)
     */
    @Transactional
    public Order buyOrder(String userId, String market, BigDecimal price, BigDecimal volume, String orderType) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        BigDecimal totalCost = price.multiply(volume);

        // 1. KRW 지갑 확인 및 잔액 차감
        UserAsset krwAsset = userAssetRepository.findByUserAndCurrency(user, "KRW")
                .orElseThrow(() -> new IllegalStateException("원화(KRW) 지갑이 존재하지 않습니다. 먼저 시드머니를 주입받으세요."));

        if (krwAsset.getBalance().compareTo(totalCost) < 0) {
            throw new IllegalStateException("잔액이 부족합니다.");
        }
        krwAsset.setBalance(krwAsset.getBalance().subtract(totalCost));
        userAssetRepository.save(krwAsset);

        // 2. 코인 지갑 추가 (market 예: "KRW-BTC" -> "BTC")
        String currency = market.split("-")[1];
        Optional<UserAsset> coinAssetOpt = userAssetRepository.findByUserAndCurrency(user, currency);
        
        UserAsset coinAsset;
        if (coinAssetOpt.isPresent()) {
            coinAsset = coinAssetOpt.get();
            // 평단가 계산: (기존총액 + 신규총액) / (기존수량 + 신규수량)
            BigDecimal oldTotal = coinAsset.getBalance().multiply(coinAsset.getAvgBuyPrice());
            BigDecimal newTotal = oldTotal.add(totalCost);
            BigDecimal newBalance = coinAsset.getBalance().add(volume);
            BigDecimal newAvgPrice = newTotal.divide(newBalance, 8, RoundingMode.HALF_UP);
            
            coinAsset.setBalance(newBalance);
            coinAsset.setAvgBuyPrice(newAvgPrice);
        } else {
            coinAsset = UserAsset.builder()
                    .user(user)
                    .currency(currency)
                    .balance(volume)
                    .avgBuyPrice(price)
                    .build();
        }
        userAssetRepository.save(coinAsset);

        // 3. 주문 내역 저장
        Order order = Order.builder()
                .user(user)
                .market(market)
                .side("BUY")
                .orderType(orderType)
                .price(price)
                .volume(volume)
                .state("DONE") // 모의투자는 무조건 즉시 체결 처리
                .build();
        
        return orderRepository.save(order);
    }

    /**
     * 지정가 매도 처리
     */
    @Transactional
    public Order sellOrder(String userId, String market, BigDecimal price, BigDecimal volume, String orderType) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        String currency = market.split("-")[1];

        // 1. 코인 지갑 확인 및 잔고 차감
        UserAsset coinAsset = userAssetRepository.findByUserAndCurrency(user, currency)
                .orElseThrow(() -> new IllegalStateException("보유하지 않은 코인입니다."));

        if (coinAsset.getBalance().compareTo(volume) < 0) {
            throw new IllegalStateException("보유 수량이 부족합니다.");
        }
        coinAsset.setBalance(coinAsset.getBalance().subtract(volume));
        userAssetRepository.save(coinAsset);

        // 2. KRW 지갑 수익금 추가
        BigDecimal totalEarned = price.multiply(volume);
        UserAsset krwAsset = userAssetRepository.findByUserAndCurrency(user, "KRW")
                .orElseThrow(() -> new IllegalStateException("원화(KRW) 지갑이 존재하지 않습니다."));
        
        krwAsset.setBalance(krwAsset.getBalance().add(totalEarned));
        userAssetRepository.save(krwAsset);

        // 3. 주문 내역 저장
        Order order = Order.builder()
                .user(user)
                .market(market)
                .side("SELL")
                .orderType(orderType)
                .price(price)
                .volume(volume)
                .state("DONE")
                .build();
        
        return orderRepository.save(order);
    }
}
