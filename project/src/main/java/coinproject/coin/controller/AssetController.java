package coinproject.coin.controller;

import coinproject.coin.entity.UserAsset;
import coinproject.coin.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;

    /**
     * 유저의 모든 보유 자산 목록 조회
     */
    @GetMapping
    public ResponseEntity<?> getAssets(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader, HttpSession session) {
        String loggedInUserId = userIdHeader != null ? userIdHeader : (String) session.getAttribute("loggedInUserId");
        if (loggedInUserId == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "로그인이 필요합니다."));
        }

        try {
            List<UserAsset> assets = assetService.getUserAssets(loggedInUserId);
            return ResponseEntity.ok(Map.of("success", true, "data", assets));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 유저의 특정 화폐(KRW 등) 잔고 조회 및 자동 초기화
     */
    @GetMapping("/{currency}")
    public ResponseEntity<?> getAssetByCurrency(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader, HttpSession session, @PathVariable String currency) {
        String loggedInUserId = userIdHeader != null ? userIdHeader : (String) session.getAttribute("loggedInUserId");
        if (loggedInUserId == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "로그인이 필요합니다."));
        }

        try {
            String targetCurrency = currency.toUpperCase();
            Optional<UserAsset> asset = assetService.getUserAsset(loggedInUserId, targetCurrency);
            
            if (asset.isPresent()) {
                return ResponseEntity.ok(Map.of("success", true, "data", asset.get()));
            } else {
                // KRW 지갑이 없으면 자동으로 10,000,000 KRW 지급
                if ("KRW".equals(targetCurrency)) {
                    UserAsset newWallet = assetService.initKrwBalance(loggedInUserId, new BigDecimal("10000000"));
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("data", newWallet);
                    response.put("message", "초기 시드머니 1,000만 원이 지급되었습니다.");
                    return ResponseEntity.ok(response);
                }
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("data", null);
                return ResponseEntity.ok(response); // 다른 코인 지갑 없음
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 추가 자본금 주입 (필요 시 사용)
     */
    @PostMapping("/init")
    public ResponseEntity<?> initKrwWallet(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader, HttpSession session, @RequestBody Map<String, Object> payload) {
        String loggedInUserId = userIdHeader != null ? userIdHeader : (String) session.getAttribute("loggedInUserId");
        if (loggedInUserId == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "로그인이 필요합니다."));
        }

        try {
            Number amountNum = (Number) payload.get("amount");
            if (amountNum == null || amountNum.doubleValue() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "유효한 금액을 입력해주세요."));
            }
            
            BigDecimal initialAmount = new BigDecimal(amountNum.toString());
            UserAsset newWallet = assetService.initKrwBalance(loggedInUserId, initialAmount);
            
            return ResponseEntity.ok(Map.of("success", true, "message", "시드머니가 성공적으로 지급되었습니다.", "data", newWallet));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "서버 오류: " + e.getMessage()));
        }
    }
}
