package coinproject.coin.repository;

import coinproject.coin.entity.User;
import coinproject.coin.entity.UserAiConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAiConfigRepository extends JpaRepository<UserAiConfig, Long> {
    Optional<UserAiConfig> findByUser(User user);
    List<UserAiConfig> findByIsActiveTrue();
}
