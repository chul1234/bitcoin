package coinproject.coin.repository;

import coinproject.coin.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUser(coinproject.coin.entity.User user);
    Optional<Favorite> findByUserAndMarket(coinproject.coin.entity.User user, String market);
}
