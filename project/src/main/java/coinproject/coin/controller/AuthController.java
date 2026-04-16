package coinproject.coin.controller;

import coinproject.coin.entity.User;
import coinproject.coin.repository.UserRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getId() == null || request.getPassword() == null) {
            response.put("success", false);
            response.put("message", "아이디와 비밀번호를 모두 입력해주세요.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // DB에서 사용자 조회
        Optional<User> userOpt = userRepository.findByUserId(request.getId());

        if (userOpt.isPresent() && userOpt.get().getPassword().equals(request.getPassword())) {
            response.put("success", true);
            response.put("message", "로그인 성공");
            response.put("userName", userOpt.get().getName());
            response.put("token", "jwt-token-" + System.currentTimeMillis());
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "아이디 또는 비밀번호가 일치하지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody SignupRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (request.getUserId() == null || request.getPassword() == null || 
            request.getName() == null || request.getEmail() == null) {
            response.put("success", false);
            response.put("message", "모든 정보를 입력해주세요.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 중복 체크 (아이디)
        if (userRepository.findByUserId(request.getUserId()).isPresent()) {
            response.put("success", false);
            response.put("message", "이미 존재하는 아이디입니다.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }

        // 중복 체크 (이메일)
        // Note: userRepository에 findByEmail이 필요할 수 있으나, 현재는 엔티티 제약조건으로 방어
        
        // 사용자 저장
        User newUser = User.builder()
                .userId(request.getUserId())
                .password(request.getPassword())
                .name(request.getName())
                .email(request.getEmail())
                .build();
        
        userRepository.save(newUser);

        response.put("success", true);
        response.put("message", "회원가입이 완료되었습니다.");
        return ResponseEntity.ok(response);
    }

    @Data
    public static class LoginRequest {
        private String id;
        private String password;
    }

    @Data
    public static class SignupRequest {
        private String userId;
        private String password;
        private String name;
        private String email;
    }
}
