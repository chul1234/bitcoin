package coinproject.coin.service;

import coinproject.coin.entity.Comment;
import coinproject.coin.entity.Post;
import coinproject.coin.entity.User;
import coinproject.coin.repository.CommentRepository;
import coinproject.coin.repository.PostRepository;
import coinproject.coin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    public Map<String, Object> getPostsPage(int page, int size, String keyword) {
        Page<Post> postPage;
        if (keyword != null && !keyword.trim().isEmpty()) {
            // Native Query용 정렬 객체 (DB 컬럼명 기준)
            Pageable nativePageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "is_notice").and(Sort.by(Sort.Direction.DESC, "created_at")));
            // +검색어* 형태로 간단 변환하여 Boolean 모드 검색 효율 증대
            String searchKeyword = "+" + keyword.trim().replaceAll("\\s+", " +") + "*";
            postPage = postRepository.searchByKeywordNative(searchKeyword, nativePageable);
        } else {
            // JPQL용 정렬 객체 (엔티티 필드명 기준)
            Pageable jpqlPageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "isNotice").and(Sort.by(Sort.Direction.DESC, "createdAt")));
            postPage = postRepository.findAll(jpqlPageable);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("content", postPage.getContent().stream().map(this::convertToPostMap).collect(Collectors.toList()));
        result.put("totalPages", postPage.getTotalPages());
        result.put("totalElements", postPage.getTotalElements());
        result.put("currentPage", postPage.getNumber());
        
        return result;
    }

    @Transactional
    public Map<String, Object> getPostAndIncrementView(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        post.setViewCount(post.getViewCount() + 1);
        return convertToPostMap(post);
    }

    @Transactional
    public Map<String, Object> createPost(Map<String, Object> data, boolean isAdmin) {
        String userId = (String) data.get("userId");
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Post post = new Post();
        post.setUser(user);
        post.setTitle((String) data.get("title"));
        post.setContent((String) data.get("content"));
        post.setIsAnonymous(Boolean.TRUE.equals(data.get("isAnon")));
        
        if (isAdmin && data.containsKey("isNotice")) {
            post.setIsNotice(Boolean.TRUE.equals(data.get("isNotice")));
        }

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
        
        if (isAdmin && data.containsKey("isNotice")) {
            post.setIsNotice(Boolean.TRUE.equals(data.get("isNotice")));
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
    // MyPage Features
    // ==========================================
    
    @Transactional(readOnly = true)
    public Map<String, Object> getMyPostsPage(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> postPage = postRepository.findByUser_UserIdOrderByCreatedAtDesc(userId, pageable);
        
        List<Map<String, Object>> content = postPage.getContent().stream()
                .map(this::convertToPostMap)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("currentPage", postPage.getNumber());
        result.put("totalElements", postPage.getTotalElements());
        result.put("totalPages", postPage.getTotalPages());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyCommentsPage(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Comment> commentPage = commentRepository.findByUser_UserIdOrderByCreatedAtDesc(userId, pageable);
        
        List<Map<String, Object>> content = commentPage.getContent().stream()
                .map(this::convertToCommentMap)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("currentPage", commentPage.getNumber());
        result.put("totalElements", commentPage.getTotalElements());
        result.put("totalPages", commentPage.getTotalPages());
        return result;
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
        map.put("viewCount", post.getViewCount());
        map.put("isNotice", post.getIsNotice());
        map.put("date", post.getCreatedAt() != null ? post.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null);
        
        if (post.getUser() != null) {
            String userId = post.getUser().getUserId();
            map.put("userId", userId);
            map.put("author", Boolean.TRUE.equals(post.getIsAnonymous()) ? "익명" : post.getUser().getName());
            map.put("tier", "admin".equals(userId) ? "DIAMOND" : post.getUser().getTier());
            map.put("profitRate", post.getUser().getCumulativeProfitRate());
        } else {
            map.put("userId", "unknown");
            map.put("author", "알 수 없음");
            map.put("tier", "BRONZE");
            map.put("profitRate", 0);
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
            String userId = comment.getUser().getUserId();
            map.put("userId", userId);
            map.put("author", Boolean.TRUE.equals(comment.getIsAnonymous()) ? "익명" : comment.getUser().getName());
            map.put("tier", "admin".equals(userId) ? "DIAMOND" : comment.getUser().getTier());
            map.put("profitRate", comment.getUser().getCumulativeProfitRate());
        } else {
            map.put("userId", "unknown");
            map.put("author", "알 수 없음");
            map.put("tier", "BRONZE");
            map.put("profitRate", 0);
        }
        return map;
    }
}
