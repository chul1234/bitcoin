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

            if (price.compareTo(BigDecimal.ZERO) <= 0 || volume.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "가격과 수량은 0보다 커야 합니다."));
            }

            Order order = orderService.buyOrder(userIdHeader, market, price, volume, orderType);
            return ResponseEntity.ok(Map.of("success", true, "message", "매수 주문이 체결되었습니다.", "data", order));
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

            if (price.compareTo(BigDecimal.ZERO) <= 0 || volume.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "가격과 수량은 0보다 커야 합니다."));
            }

            Order order = orderService.sellOrder(userIdHeader, market, price, volume, orderType);
            return ResponseEntity.ok(Map.of("success", true, "message", "매도 주문이 체결되었습니다.", "data", order));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "입력값이 올바르지 않거나 서버 에러가 발생했습니다."));
        }
    }
}
