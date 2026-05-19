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

@RestController
@RequestMapping("/api/ai/bot")

public class AiBotController {

    private final UserAiConfigRepository userAiConfigRepository;
    private final UserRepository userRepository;

    public AiBotController(UserAiConfigRepository userAiConfigRepository, UserRepository userRepository) {
        this.userAiConfigRepository = userAiConfigRepository;
        this.userRepository = userRepository;
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
}
