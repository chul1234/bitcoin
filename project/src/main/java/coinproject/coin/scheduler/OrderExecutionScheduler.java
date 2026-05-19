package coinproject.coin.scheduler;

import coinproject.coin.entity.Order;
import coinproject.coin.repository.OrderRepository;
import coinproject.coin.service.OrderService;
import coinproject.coin.service.UpbitPriceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExecutionScheduler {

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final UpbitPriceService upbitPriceService;

    /**
     * 3초마다 미체결(PENDING) 및 감시대기(WAITING_TRIGGER) 주문을 검사하여 체결시킵니다.
     */
    @Scheduled(fixedRate = 3000)
    public void processPendingOrders() {
        // 1. 대기 중인 모든 주문 가져오기
        List<Order> pendingOrders = orderRepository.findByStateIn(Arrays.asList("PENDING", "WAITING_TRIGGER"));
        if (pendingOrders.isEmpty()) {
            return;
        }

        // 2. 대기 중인 주문들의 마켓(코인) 목록만 추출
        Set<String> markets = pendingOrders.stream()
                .map(Order::getMarket)
                .collect(Collectors.toSet());

        // 3. 업비트에서 해당 마켓들의 현재 실시간 시세 한 번에 조회 (단일 API 콜)
        Map<String, BigDecimal> currentPrices = upbitPriceService.getCurrentPrices(markets);

        // 4. 각 주문별 조건 검사 및 체결 처리
        for (Order order : pendingOrders) {
            BigDecimal currentPrice = currentPrices.get(order.getMarket());
            if (currentPrice == null) continue; // 시세를 못 가져왔으면 패스

            try {
                processSingleOrder(order, currentPrice);
            } catch (Exception e) {
                log.error("주문 ID {} 체결 처리 중 오류 발생: {}", order.getId(), e.getMessage());
                // 다른 주문 처리에 영향을 주지 않도록 예외를 잡고 계속 진행
            }
        }
    }

    private void processSingleOrder(Order order, BigDecimal currentPrice) {
        String state = order.getState();
        String side = order.getSide().toUpperCase();

        if ("PENDING".equals(state)) {
            // 지정가 매수: 현재가가 주문가 이하로 떨어지면 체결
            if ("BUY".equals(side) && currentPrice.compareTo(order.getPrice()) <= 0) {
                orderService.fulfillBuyOrder(order);
                log.info("지정가 매수 체결 완료: 주문ID={}, 마켓={}, 가격={}", order.getId(), order.getMarket(), order.getPrice());
            }
            // 지정가 매도: 현재가가 주문가 이상으로 올라가면 체결
            else if ("SELL".equals(side) && currentPrice.compareTo(order.getPrice()) >= 0) {
                orderService.fulfillSellOrder(order);
                log.info("지정가 매도 체결 완료: 주문ID={}, 마켓={}, 가격={}", order.getId(), order.getMarket(), order.getPrice());
            }
        } 
        else if ("WAITING_TRIGGER".equals(state)) {
            // 감시가(Trigger) 로직
            // 매수: 현재가가 목표가(감시가) 이상으로 치솟을 때 돌파 매수(Stop-Buy) 발동
            if ("BUY".equals(side) && currentPrice.compareTo(order.getTriggerPrice()) >= 0) {
                activateTriggerOrder(order);
                log.info("예약 매수 감시가 도달, PENDING 상태로 전환: 주문ID={}", order.getId());
            }
            // 매도: 현재가가 목표가(감시가) 이하로 떨어질 때 손절매(Stop-Sell) 발동
            else if ("SELL".equals(side) && currentPrice.compareTo(order.getTriggerPrice()) <= 0) {
                activateTriggerOrder(order);
                log.info("예약 매도 감시가 도달, PENDING 상태로 전환: 주문ID={}", order.getId());
            }
        }
    }

    private void activateTriggerOrder(Order order) {
        order.setState("PENDING");
        orderRepository.save(order);
        // 상태 변경 후 즉시 지정가 조건에 맞는지 확인하기 위해 다음 스케줄러 턴에 자동으로 PENDING 로직을 타게 됨
    }
}
