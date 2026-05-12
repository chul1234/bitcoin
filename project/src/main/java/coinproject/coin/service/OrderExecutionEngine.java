package coinproject.coin.service;

import coinproject.coin.entity.Order;
import coinproject.coin.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderExecutionEngine {

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final UpbitPriceService upbitPriceService;

    /**
     * 1초마다 실행되어 PENDING 상태의 주문들을 스캔하고 조건 도달 시 체결시킵니다.
     */
    @Scheduled(fixedDelay = 1000)
    public void executePendingOrders() {
        // 1. PENDING(지정가 대기) 및 WAITING_TRIGGER(감시 대기) 상태의 모든 주문 가져오기
        List<Order> activeOrders = orderRepository.findByStateIn(Arrays.asList("PENDING", "WAITING_TRIGGER"));
        
        if (activeOrders.isEmpty()) {
            return; // 미체결 주문이 없으면 바로 종료
        }

        // 2. 대상 마켓(코인) 목록 추출
        Set<String> targetMarkets = activeOrders.stream()
                .map(Order::getMarket)
                .collect(Collectors.toSet());

        // 3. 업비트 실시간 현재가 조회
        Map<String, BigDecimal> currentPrices = upbitPriceService.getCurrentPrices(targetMarkets);

        // 4. 각 주문별로 조건 검사
        for (Order order : activeOrders) {
            BigDecimal currentPrice = currentPrices.get(order.getMarket());
            if (currentPrice == null) continue; // 시세 조회가 실패했거나 딜레이된 경우 다음 사이클로

            // [1단계] 감시가(Trigger Price) 대기 중인 주문 처리
            if ("WAITING_TRIGGER".equals(order.getState())) {
                boolean isTriggered = false;
                if ("BUY".equalsIgnoreCase(order.getSide()) && currentPrice.compareTo(order.getTriggerPrice()) >= 0) {
                    // 돌파 매수: 현재가가 감시가보다 같거나 커지면 발동
                    isTriggered = true;
                } else if ("SELL".equalsIgnoreCase(order.getSide()) && currentPrice.compareTo(order.getTriggerPrice()) <= 0) {
                    // 손절 매도: 현재가가 감시가보다 같거나 작아지면 발동
                    isTriggered = true;
                }

                if (isTriggered) {
                    order.setState("PENDING");
                    orderRepository.save(order);
                    System.out.println("[감시 발동] 주문번호 " + order.getId() + " - " + order.getSide() + " " + order.getMarket() + " (감시가: " + order.getTriggerPrice() + " 도달 -> 지정가 전환)");
                    // 이번 사이클에 즉시 체결 조건도 만족하는지 확인하기 위해 아래 로직을 계속 타게 둠
                } else {
                    continue; // 아직 발동 안 했으면 다음 주문으로
                }
            }

            // [2단계] 지정가(Limit Price) 대기 중인 주문 처리 (발동된 예약주문 포함)
            if ("PENDING".equals(order.getState())) {
                boolean shouldExecute = false;

                if ("BUY".equalsIgnoreCase(order.getSide())) {
                    // 매수: 내가 지정한 가격(주문가)보다 현재가가 같거나 낮아지면 체결
                    if (currentPrice.compareTo(order.getPrice()) <= 0) {
                        shouldExecute = true;
                    }
                } else if ("SELL".equalsIgnoreCase(order.getSide())) {
                    // 매도: 내가 지정한 가격(주문가)보다 현재가가 같거나 높아지면 체결
                    if (currentPrice.compareTo(order.getPrice()) >= 0) {
                        shouldExecute = true;
                    }
                }

                // 5. 조건 만족 시 실제 체결 로직 수행 (OrderService 호출)
                if (shouldExecute) {
                    try {
                        if ("BUY".equalsIgnoreCase(order.getSide())) {
                            orderService.fulfillBuyOrder(order);
                        } else {
                            orderService.fulfillSellOrder(order);
                        }
                        System.out.println("[체결 완료] 주문번호 " + order.getId() + " - " + order.getSide() + " " + order.getMarket() + " at " + currentPrice);
                    } catch (Exception e) {
                        System.err.println("[체결 실패] 주문번호 " + order.getId() + " : " + e.getMessage());
                    }
                }
            }
        }
    }
}
