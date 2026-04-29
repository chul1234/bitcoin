package coinproject.coin.controller;

import coinproject.coin.entity.UserRole;
import coinproject.coin.repository.UserRoleRepository;
import coinproject.coin.service.BoardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BoardController {

    @Autowired
    private BoardService boardService;

    @Autowired
    private UserRoleRepository userRoleRepository;

    // 헬퍼: 사용자가 관리자인지 확인
    private boolean isAdmin(String userId) {
        if (userId == null || userId.isEmpty()) return false;
        List<UserRole> roles = userRoleRepository.findByUserId(userId);
        return roles.stream().anyMatch(r -> "ADMIN".equals(r.getRoleId()));
    }

    // ==========================================
    // 1. 게시글 API
    // ==========================================

    @GetMapping("/posts")
    public ResponseEntity<Map<String, Object>> getAllPosts() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> posts = boardService.getAllPosts();
            response.put("success", true);
            response.put("data", posts);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/posts")
    public ResponseEntity<Map<String, Object>> createPost(@RequestBody Map<String, Object> data) {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> newPost = boardService.createPost(data);
            response.put("success", true);
            response.put("data", newPost);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/posts/{id}")
    public ResponseEntity<Map<String, Object>> updatePost(@PathVariable Long id, 
                                                          @RequestHeader("X-User-Id") String requestUserId,
                                                          @RequestBody Map<String, Object> data) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean admin = isAdmin(requestUserId);
            Map<String, Object> updatedPost = boardService.updatePost(id, data, requestUserId, admin);
            response.put("success", true);
            response.put("data", updatedPost);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Map<String, Object>> deletePost(@PathVariable Long id, 
                                                          @RequestHeader("X-User-Id") String requestUserId) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean admin = isAdmin(requestUserId);
            boardService.deletePost(id, requestUserId, admin);
            response.put("success", true);
            response.put("message", "게시글이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // ==========================================
    // 2. 댓글 API
    // ==========================================

    @GetMapping("/comments")
    public ResponseEntity<Map<String, Object>> getCommentsByPostId(@RequestParam Long postId) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> comments = boardService.getCommentsByPostId(postId);
            response.put("success", true);
            response.put("data", comments);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/comments")
    public ResponseEntity<Map<String, Object>> createComment(@RequestBody Map<String, Object> data) {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> newComment = boardService.createComment(data);
            response.put("success", true);
            response.put("data", newComment);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/comments/{id}")
    public ResponseEntity<Map<String, Object>> updateComment(@PathVariable Long id, 
                                                             @RequestHeader("X-User-Id") String requestUserId,
                                                             @RequestBody Map<String, Object> data) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean admin = isAdmin(requestUserId);
            Map<String, Object> updatedComment = boardService.updateComment(id, data, requestUserId, admin);
            response.put("success", true);
            response.put("data", updatedComment);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Map<String, Object>> deleteComment(@PathVariable Long id, 
                                                             @RequestHeader("X-User-Id") String requestUserId) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean admin = isAdmin(requestUserId);
            boardService.deleteComment(id, requestUserId, admin);
            response.put("success", true);
            response.put("message", "댓글이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
