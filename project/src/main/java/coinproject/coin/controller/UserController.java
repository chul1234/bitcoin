package coinproject.coin.controller;

import coinproject.coin.entity.User;
import coinproject.coin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    // 1. 회원 정보 조회
    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getUserInfo(@PathVariable String userId) {
        Map<String, Object> response = new HashMap<>();

        Optional<User> userOpt = userRepository.findByUserId(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            response.put("success", true);
            response.put("userId", user.getUserId());
            response.put("name", user.getName());
            response.put("email", user.getEmail());
            response.put("createdAt", user.getCreatedAt());
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "사용자를 찾을 수 없습니다.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    // 2. 회원 정보 갱신 (비밀번호 검증 포함 권장, 편의상 즉시 갱신)
    @PutMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> updateUserProfile(
            @PathVariable String userId,
            @RequestBody UpdateRequest request) {

        Map<String, Object> response = new HashMap<>();

        Optional<User> userOpt = userRepository.findByUserId(userId);
        if (userOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "사용자를 찾을 수 없습니다.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }

        User user = userOpt.get();

        // 사용자 아이디(userId)가 변경되었을 때, 다른 사람이 쓰고 있는지 중복 체크
        if (request.getNewUserId() != null && !request.getNewUserId().isEmpty() && !request.getNewUserId().equals(userId)) {
            if (userRepository.findByUserId(request.getNewUserId()).isPresent()) {
                response.put("success", false);
                response.put("message", "이미 사용 중인 아이디입니다.");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            user.setUserId(request.getNewUserId());
        }

        // 비밀번호 갱신
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(request.getPassword());
        }

        // 이메일 갱신
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            user.setEmail(request.getEmail());
        }

        userRepository.save(user);

        response.put("success", true);
        response.put("message", "회원 정보가 성공적으로 수정되었습니다.");
        response.put("newUserId", user.getUserId());
        return ResponseEntity.ok(response);
    }

    // 3. 회원 탈퇴
    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable String userId) {
        Map<String, Object> response = new HashMap<>();

        Optional<User> userOpt = userRepository.findByUserId(userId);
        if (userOpt.isPresent()) {
            userRepository.delete(userOpt.get());
            response.put("success", true);
            response.put("message", "회원 탈퇴가 완료되었습니다.");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "사용자를 찾을 수 없습니다.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    // 데이터 교환용 DTO
    public static class UpdateRequest {
        private String newUserId;
        private String password;
        private String email;

        public String getNewUserId() { return newUserId; }
        public void setNewUserId(String newUserId) { this.newUserId = newUserId; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
