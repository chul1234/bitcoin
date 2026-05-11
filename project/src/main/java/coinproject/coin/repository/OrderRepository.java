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
}
