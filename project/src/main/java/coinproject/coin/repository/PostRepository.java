package coinproject.coin.repository;

import coinproject.coin.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {
    
    // IDE의 SQL 문법 검사기(빨간줄)를 우회하기 위해 쿼리를 상수로 분리
    String SEARCH_QUERY = "SELECT * FROM posts WHERE MATCH(title, content) AGAINST(:keyword IN BOOLEAN MODE)";
    String COUNT_QUERY = "SELECT count(*) FROM posts WHERE MATCH(title, content) AGAINST(:keyword IN BOOLEAN MODE)";

    @Query(value = SEARCH_QUERY, countQuery = COUNT_QUERY, nativeQuery = true)
    Page<Post> searchByKeywordNative(@Param("keyword") String keyword, Pageable pageable);

    // 마이페이지: 내가 쓴 글 조회
    Page<Post> findByUser_UserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
