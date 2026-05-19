package coinproject.coin.controller;

import coinproject.coin.entity.Favorite;
import coinproject.coin.entity.User;
import coinproject.coin.repository.FavoriteRepository;
import coinproject.coin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getFavorites(@RequestParam Long userId) {
        try {
            List<Favorite> favorites = favoriteRepository.findByUserId(userId);
            List<String> markets = favorites.stream()
                    .map(Favorite::getMarket)
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", markets);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "관심 코인 조회 실패: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/toggle")
    public ResponseEntity<?> toggleFavorite(@RequestBody Map<String, Object> payload) {
        try {
            Long userId = Long.parseLong(payload.get("userId").toString());
            String market = payload.get("market").toString();

            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                throw new RuntimeException("사용자를 찾을 수 없습니다.");
            }

            Optional<Favorite> existingOpt = favoriteRepository.findByUserIdAndMarket(userId, market);
            boolean isAdded = false;

            if (existingOpt.isPresent()) {
                // 이미 존재하면 삭제
                favoriteRepository.delete(existingOpt.get());
            } else {
                // 없으면 추가
                Favorite fav = Favorite.builder()
                        .user(userOpt.get())
                        .market(market)
                        .build();
                favoriteRepository.save(fav);
                isAdded = true;
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isAdded", isAdded);
            response.put("message", isAdded ? "관심 코인으로 등록되었습니다." : "관심 코인에서 해제되었습니다.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "토글 실패: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
