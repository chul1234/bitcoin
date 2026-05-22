package coinproject.coin.repository;

import coinproject.coin.entity.Order;
import coinproject.coin.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserOrderByCreatedAtDesc(User user);
    List<Order> findByUserAndStateOrderByCreatedAtDesc(User user, String state);
    void deleteByUser(User user);
    List<Order> findByState(String state);
    List<Order> findByStateIn(List<String> states);
    
    // AI 자동매매 - 최근 매수 내역 및 매수 횟수 조회용
    java.util.Optional<Order> findFirstByUserAndMarketAndSideOrderByCreatedAtDesc(User user, String market, String side);
    long countByUserAndMarketAndSide(User user, String market, String side);
}
