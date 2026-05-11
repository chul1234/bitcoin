package coinproject.coin.repository;

import coinproject.coin.entity.User;
import coinproject.coin.entity.UserAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAssetRepository extends JpaRepository<UserAsset, Long> {
    List<UserAsset> findByUser(User user);
    Optional<UserAsset> findByUserAndCurrency(User user, String currency);
}
