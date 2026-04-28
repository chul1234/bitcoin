package coinproject.coin.controller;

import coinproject.coin.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private UserService userService;

    /**
     * 전체 유저 및 권한 목록 조회
     */
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        Map<String, Object> response = new HashMap<>();
        List<Map<String, Object>> users = userService.getAllUsersWithRoles();
        
        response.put("success", true);
        response.put("data", users);
        return ResponseEntity.ok(response);
    }

    /**
     * 다중 사용자 일괄 등록
     */
    @PostMapping("/users/batch")
    public ResponseEntity<Map<String, Object>> registerUsersBatch(@RequestBody List<Map<String, String>> requestList) {
        Map<String, Object> response = new HashMap<>();
        
        if (requestList == null || requestList.isEmpty()) {
            response.put("success", false);
            response.put("message", "요청 데이터가 없습니다.");
            return ResponseEntity.badRequest().body(response);
        }

        userService.registerUsersBatch(requestList);

        response.put("success", true);
        response.put("message", "일괄 등록이 완료되었습니다.");
        return ResponseEntity.ok(response);
    }

    /**
     * 특정 사용자 권한 수정
     */
    @PutMapping("/users/{userId}/roles")
    public ResponseEntity<Map<String, Object>> updateUserRoles(
            @PathVariable String userId, 
            @RequestBody Map<String, List<String>> request) {
        
        Map<String, Object> response = new HashMap<>();
        List<String> newRoles = request.get("roles");

        userService.updateUserRoles(userId, newRoles);

        response.put("success", true);
        response.put("message", "권한이 성공적으로 변경되었습니다.");
        return ResponseEntity.ok(response);
    }
}
