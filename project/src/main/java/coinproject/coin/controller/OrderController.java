package coinproject.coin.controller;

import coinproject.coin.entity.Order;
import coinproject.coin.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/buy")
    public ResponseEntity<?> buyOrder(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
                                      @RequestBody Map<String, Object> payload) {
        if (userIdHeader == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "로그인이 필요합니다."));
        }

        try {
            String market = (String) payload.get("market");
            String orderType = (String) payload.getOrDefault("orderType", "LIMIT");
            BigDecimal price = new BigDecimal(payload.get("price").toString());
            BigDecimal volume = new BigDecimal(payload.get("volume").toString());
            BigDecimal triggerPrice = payload.containsKey("triggerPrice") ? new BigDecimal(payload.get("triggerPrice").toString()) : null;

            if (price.compareTo(BigDecimal.ZERO) <= 0 || volume.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "가격과 수량은 0보다 커야 합니다."));
            }

            Order order = orderService.buyOrder(userIdHeader, market, price, volume, orderType, triggerPrice);
            String msg = "매수 주문이 즉시 체결되었습니다.";
            if ("PENDING".equals(order.getState())) {
                msg = "매수 지정가 주문이 대기(PENDING) 상태로 등록되었습니다.";
            } else if ("WAITING_TRIGGER".equals(order.getState())) {
                msg = "매수 예약-지정가 주문이 감시 대기(WAITING_TRIGGER) 상태로 등록되었습니다.";
            }
            return ResponseEntity.ok(Map.of("success", true, "message", msg, "data", order));
        } catch (IllegalStateException e) {
            // 잔고 부족 등 비즈니스 로직 에러
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "입력값이 올바르지 않거나 서버 에러가 발생했습니다."));
        }
    }

    @PostMapping("/sell")
    public ResponseEntity<?> sellOrder(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
                                       @RequestBody Map<String, Object> payload) {
        if (userIdHeader == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "로그인이 필요합니다."));
        }

        try {
            String market = (String) payload.get("market");
            String orderType = (String) payload.getOrDefault("orderType", "LIMIT");
            BigDecimal price = new BigDecimal(payload.get("price").toString());
            BigDecimal volume = new BigDecimal(payload.get("volume").toString());
            BigDecimal triggerPrice = payload.containsKey("triggerPrice") ? new BigDecimal(payload.get("triggerPrice").toString()) : null;

            if (price.compareTo(BigDecimal.ZERO) <= 0 || volume.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "가격과 수량은 0보다 커야 합니다."));
            }

            Order order = orderService.sellOrder(userIdHeader, market, price, volume, orderType, triggerPrice);
            String msg = "매도 주문이 즉시 체결되었습니다.";
            if ("PENDING".equals(order.getState())) {
                msg = "매도 지정가 주문이 대기(PENDING) 상태로 등록되었습니다.";
            } else if ("WAITING_TRIGGER".equals(order.getState())) {
                msg = "매도 예약-지정가 주문이 감시 대기(WAITING_TRIGGER) 상태로 등록되었습니다.";
            }
            return ResponseEntity.ok(Map.of("success", true, "message", msg, "data", order));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "입력값이 올바르지 않거나 서버 에러가 발생했습니다."));
        }
    }

    @GetMapping
    public ResponseEntity<?> getUserOrders(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        if (userIdHeader == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "로그인이 필요합니다."));
        }

        try {
            java.util.List<Order> orders = orderService.getUserOrders(userIdHeader);
            return ResponseEntity.ok(Map.of("success", true, "data", orders));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "주문 내역 조회 실패: " + e.getMessage()));
        }
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
                                         @PathVariable Long orderId) {
        if (userIdHeader == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "로그인이 필요합니다."));
        }

        try {
            Order canceledOrder = orderService.cancelOrder(userIdHeader, orderId);
            return ResponseEntity.ok(Map.of("success", true, "message", "미체결 주문이 취소되고 자산이 환불되었습니다.", "data", canceledOrder));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "주문 취소 중 서버 에러가 발생했습니다."));
        }
    }
}
