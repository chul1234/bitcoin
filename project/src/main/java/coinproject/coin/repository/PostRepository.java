package coinproject.coin.repository;

import coinproject.coin.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {
    
    // 검색어 없을 때 전체 조회 (정렬은 Pageable에서 isNotice DESC, createdAt DESC)
    Page<Post> findAll(Pageable pageable);

    // FULLTEXT 전문 검색 (Native Query)
    @Query(value = "SELECT * FROM posts WHERE MATCH(title, content) AGAINST(:keyword IN BOOLEAN MODE)", 
           countQuery = "SELECT count(*) FROM posts WHERE MATCH(title, content) AGAINST(:keyword IN BOOLEAN MODE)", 
           nativeQuery = true)
    Page<Post> searchByKeywordNative(@Param("keyword") String keyword, Pageable pageable);
}
