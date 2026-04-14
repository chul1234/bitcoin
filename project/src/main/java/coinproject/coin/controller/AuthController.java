package coinproject.coin.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // 프론트엔드 React 서버(Vite)와 통신하기 위해 임시 개방
public class AuthController {

    // 임시 더미 계정 (내일 DB 연동 전까지 사용)
    private static final String DUMMY_ID = "admin";
    private static final String DUMMY_PASSWORD = "admin";

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        Map<String, Object> response = new HashMap<>();

        // 1. 중복/빈번한 요청 방지는 프론트에서 처리하되, 서버에서도 빠른 응답으로 방어
        if (request.getId() == null || request.getPassword() == null) {
            response.put("success", false);
            response.put("message", "아이디와 비밀번호를 모두 입력해주세요.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 2. 가짜 DB 검증 로직
        if (DUMMY_ID.equals(request.getId()) && DUMMY_PASSWORD.equals(request.getPassword())) {
            response.put("success", true);
            response.put("message", "로그인 성공");
            response.put("token", "dummy-jwt-token-12345"); // 임시 토큰
            return ResponseEntity.ok(response);
        } else {
            // 로그인 틀렸을 경우 알림용
            response.put("success", false);
            response.put("message", "아이디 또는 비밀번호가 일치하지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    // 요청 데이터를 받을 DTO 내부 클래스
    public static class LoginRequest {
        private String id;
        private String password;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}
