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
    public Order buyOrder(String userId, String market, BigDecimal price, BigDecimal volume, String orderType, BigDecimal triggerPrice) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        BigDecimal totalCost = price.multiply(volume);

        // 1. KRW 지갑 확인 및 잔액 차감 (지정가든 시장가든 자산을 먼저 Lock)
        UserAsset krwAsset = userAssetRepository.findByUserAndCurrency(user, "KRW")
                .orElseThrow(() -> new IllegalStateException("원화(KRW) 지갑이 존재하지 않습니다. 먼저 시드머니를 주입받으세요."));

        if (krwAsset.getBalance().compareTo(totalCost) < 0) {
            throw new IllegalStateException("잔액이 부족합니다.");
        }
        krwAsset.setBalance(krwAsset.getBalance().subtract(totalCost));
        userAssetRepository.save(krwAsset);

        // 2. 체결 상태 결정
        String state = "PENDING";
        if ("MARKET".equalsIgnoreCase(orderType)) {
            state = "DONE";
        } else if ("STOP_LIMIT".equalsIgnoreCase(orderType)) {
            state = "WAITING_TRIGGER";
        }

        // 3. 주문 내역 저장
        Order order = Order.builder()
                .user(user)
                .market(market)
                .side("BUY")
                .orderType(orderType)
                .price(price)
                .volume(volume)
                .triggerPrice("STOP_LIMIT".equalsIgnoreCase(orderType) ? triggerPrice : null)
                .state(state)
                .build();
        
        order = orderRepository.save(order);

        // 4. 시장가면 즉시 코인 지급
        if ("DONE".equals(state)) {
            fulfillBuyOrder(order);
        }
        
        return order;
    }

    /**
     * 매수 주문 체결 (코인 지급) - 스케줄러나 시장가 체결 시 호출
     */
    @Transactional
    public void fulfillBuyOrder(Order order) {
        User user = order.getUser();
        String currency = order.getMarket().split("-")[1];
        BigDecimal volume = order.getVolume();
        BigDecimal totalCost = order.getPrice().multiply(volume);

        Optional<UserAsset> coinAssetOpt = userAssetRepository.findByUserAndCurrency(user, currency);
        UserAsset coinAsset;
        if (coinAssetOpt.isPresent()) {
            coinAsset = coinAssetOpt.get();
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
                    .avgBuyPrice(order.getPrice())
                    .build();
        }
        userAssetRepository.save(coinAsset);
        
        order.setState("DONE");
        orderRepository.save(order);
    }

    /**
     * 지정가 매도 처리
     */
    @Transactional
    public Order sellOrder(String userId, String market, BigDecimal price, BigDecimal volume, String orderType, BigDecimal triggerPrice) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        String currency = market.split("-")[1];

        // 1. 코인 지갑 확인 및 잔고 차감 (자산 Lock)
        UserAsset coinAsset = userAssetRepository.findByUserAndCurrency(user, currency)
                .orElseThrow(() -> new IllegalStateException("보유하지 않은 코인입니다."));

        if (coinAsset.getBalance().compareTo(volume) < 0) {
            throw new IllegalStateException("보유 수량이 부족합니다.");
        }
        coinAsset.setBalance(coinAsset.getBalance().subtract(volume));
        userAssetRepository.save(coinAsset);

        // 2. 체결 상태 결정
        String state = "PENDING";
        if ("MARKET".equalsIgnoreCase(orderType)) {
            state = "DONE";
        } else if ("STOP_LIMIT".equalsIgnoreCase(orderType)) {
            state = "WAITING_TRIGGER";
        }

        // 3. 주문 내역 저장
        Order order = Order.builder()
                .user(user)
                .market(market)
                .side("SELL")
                .orderType(orderType)
                .price(price)
                .volume(volume)
                .triggerPrice("STOP_LIMIT".equalsIgnoreCase(orderType) ? triggerPrice : null)
                .state(state)
                .build();
        
        order = orderRepository.save(order);

        // 4. 시장가면 즉시 원화 지급
        if ("DONE".equals(state)) {
            fulfillSellOrder(order);
        }
        
        return order;
    }

    /**
     * 매도 주문 체결 (원화 지급) - 스케줄러나 시장가 체결 시 호출
     */
    @Transactional
    public void fulfillSellOrder(Order order) {
        User user = order.getUser();
        BigDecimal totalEarned = order.getPrice().multiply(order.getVolume());
        
        UserAsset krwAsset = userAssetRepository.findByUserAndCurrency(user, "KRW")
                .orElseThrow(() -> new IllegalStateException("원화(KRW) 지갑이 존재하지 않습니다."));
        
        krwAsset.setBalance(krwAsset.getBalance().add(totalEarned));
        userAssetRepository.save(krwAsset);
        
        order.setState("DONE");
        orderRepository.save(order);
    }

    /**
     * 미체결 주문 취소 및 자산 환불
     */
    @Transactional
    public Order cancelOrder(String userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문입니다."));
        
        if (!order.getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }
        if (!"PENDING".equals(order.getState()) && !"WAITING_TRIGGER".equals(order.getState())) {
            throw new IllegalStateException("미체결 또는 대기 상태의 주문만 취소할 수 있습니다.");
        }

        // 환불 처리
        if ("BUY".equalsIgnoreCase(order.getSide())) {
            BigDecimal totalRefund = order.getPrice().multiply(order.getVolume());
            UserAsset krwAsset = userAssetRepository.findByUserAndCurrency(order.getUser(), "KRW").get();
            krwAsset.setBalance(krwAsset.getBalance().add(totalRefund));
            userAssetRepository.save(krwAsset);
        } else if ("SELL".equalsIgnoreCase(order.getSide())) {
            String currency = order.getMarket().split("-")[1];
            UserAsset coinAsset = userAssetRepository.findByUserAndCurrency(order.getUser(), currency).get();
            coinAsset.setBalance(coinAsset.getBalance().add(order.getVolume()));
            userAssetRepository.save(coinAsset);
        }

        order.setState("CANCELED");
        return orderRepository.save(order);
    }

    /**
     * 유저의 전체 주문 내역 최신순 조회
     */
    @Transactional(readOnly = true)
    public java.util.List<Order> getUserOrders(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        return orderRepository.findByUserOrderByCreatedAtDesc(user);
    }
}
