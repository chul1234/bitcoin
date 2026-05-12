package coinproject.coin.service;

import coinproject.coin.entity.Order;
import coinproject.coin.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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
        // 1. PENDING 상태의 모든 주문 가져오기
        List<Order> pendingOrders = orderRepository.findByState("PENDING");
        
        if (pendingOrders.isEmpty()) {
            return; // 미체결 주문이 없으면 바로 종료
        }

        // 2. 미체결 주문들이 바라보고 있는 대상 마켓(코인) 목록 추출 (예: KRW-BTC, KRW-XRP)
        Set<String> targetMarkets = pendingOrders.stream()
                .map(Order::getMarket)
                .collect(Collectors.toSet());

        // 3. 업비트에서 해당 마켓들의 실시간 현재가 한 번에 조회
        Map<String, BigDecimal> currentPrices = upbitPriceService.getCurrentPrices(targetMarkets);

        // 4. 각 주문별로 조건 검사 및 체결 처리
        for (Order order : pendingOrders) {
            BigDecimal currentPrice = currentPrices.get(order.getMarket());
            if (currentPrice == null) continue; // 시세 조회가 실패했거나 딜레이된 경우 다음 사이클로

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
