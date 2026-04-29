package coinproject.coin.service;

import coinproject.coin.entity.Comment;
import coinproject.coin.entity.Post;
import coinproject.coin.entity.User;
import coinproject.coin.repository.CommentRepository;
import coinproject.coin.repository.PostRepository;
import coinproject.coin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BoardService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private UserRepository userRepository;

    // ==========================================
    // 1. 게시글 (Post) 로직
    // ==========================================
    
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllPosts() {
        List<Post> posts = postRepository.findAll();
        return posts.stream().map(this::convertToPostMap).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> createPost(Map<String, Object> data) {
        String userId = (String) data.get("userId");
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Post post = new Post();
        post.setUser(user);
        post.setTitle((String) data.get("title"));
        post.setContent((String) data.get("content"));
        post.setIsAnonymous(Boolean.TRUE.equals(data.get("isAnon")));

        postRepository.save(post);
        return convertToPostMap(post);
    }

    @Transactional
    public Map<String, Object> updatePost(Long id, Map<String, Object> data, String requestUserId, boolean isAdmin) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        // 권한 확인 (본인이거나 관리자)
        if (!isAdmin && (post.getUser() == null || !post.getUser().getUserId().equals(requestUserId))) {
            throw new IllegalArgumentException("수정 권한이 없습니다.");
        }

        post.setTitle((String) data.get("title"));
        post.setContent((String) data.get("content"));
        if (data.containsKey("isAnon")) {
            post.setIsAnonymous(Boolean.TRUE.equals(data.get("isAnon")));
        }

        return convertToPostMap(post);
    }

    @Transactional
    public void deletePost(Long id, String requestUserId, boolean isAdmin) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        if (!isAdmin && (post.getUser() == null || !post.getUser().getUserId().equals(requestUserId))) {
            throw new IllegalArgumentException("삭제 권한이 없습니다.");
        }

        // 관련 댓글 모두 삭제
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(id);
        commentRepository.deleteAll(comments);

        postRepository.delete(post);
    }

    // ==========================================
    // 2. 댓글 (Comment) 로직
    // ==========================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCommentsByPostId(Long postId) {
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        return comments.stream().map(this::convertToCommentMap).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> createComment(Map<String, Object> data) {
        String userId = (String) data.get("userId");
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Long postId = Long.valueOf(data.get("postId").toString());
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        Comment comment = new Comment();
        comment.setUser(user);
        comment.setPost(post);
        comment.setContent((String) data.get("content"));
        comment.setIsAnonymous(Boolean.TRUE.equals(data.get("isAnon")));

        // 부모 댓글(대댓글인 경우)
        if (data.get("parentId") != null) {
            Long parentId = Long.valueOf(data.get("parentId").toString());
            Comment parent = commentRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("부모 댓글을 찾을 수 없습니다."));
            comment.setParent(parent);
        }

        commentRepository.save(comment);
        return convertToCommentMap(comment);
    }

    @Transactional
    public void deleteComment(Long id, String requestUserId, boolean isAdmin) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        if (!isAdmin && (comment.getUser() == null || !comment.getUser().getUserId().equals(requestUserId))) {
            throw new IllegalArgumentException("삭제 권한이 없습니다.");
        }

        // JPA 양방향 매핑 Cascade에 의해 자식 댓글들도 삭제되거나 고아 객체 삭제됨
        // 만약 직접 제어하려면 여기서 자식들을 먼저 지울 수 있음
        commentRepository.delete(comment);
    }

    @Transactional
    public Map<String, Object> updateComment(Long id, Map<String, Object> data, String requestUserId, boolean isAdmin) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        if (!isAdmin && (comment.getUser() == null || !comment.getUser().getUserId().equals(requestUserId))) {
            throw new IllegalArgumentException("수정 권한이 없습니다.");
        }

        comment.setContent((String) data.get("content"));
        return convertToCommentMap(comment);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private Map<String, Object> convertToPostMap(Post post) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", post.getId());
        map.put("title", post.getTitle());
        map.put("content", post.getContent());
        map.put("isAnon", post.getIsAnonymous());
        map.put("date", post.getCreatedAt() != null ? post.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null);
        
        if (post.getUser() != null) {
            map.put("userId", post.getUser().getUserId());
            map.put("author", Boolean.TRUE.equals(post.getIsAnonymous()) ? "익명" : post.getUser().getName());
        } else {
            map.put("userId", "unknown");
            map.put("author", "알 수 없음");
        }
        return map;
    }

    private Map<String, Object> convertToCommentMap(Comment comment) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", comment.getId());
        map.put("postId", comment.getPost() != null ? comment.getPost().getId() : null);
        map.put("parentId", comment.getParent() != null ? comment.getParent().getId() : null);
        map.put("content", comment.getContent());
        map.put("isAnon", comment.getIsAnonymous());
        map.put("date", comment.getCreatedAt() != null ? comment.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null);
        
        if (comment.getUser() != null) {
            map.put("userId", comment.getUser().getUserId());
            map.put("author", Boolean.TRUE.equals(comment.getIsAnonymous()) ? "익명" : comment.getUser().getName());
        } else {
            map.put("userId", "unknown");
            map.put("author", "알 수 없음");
        }
        return map;
    }
}
