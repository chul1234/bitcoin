package coinproject.coin.repository;

import coinproject.coin.entity.Comment;
import coinproject.coin.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    // 특정 게시글의 모든 댓글 조회 (보통 최상위 댓글만 가져오거나 전체를 가져와 조립)
    List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);
}
