package coinproject.coin.repository;

import coinproject.coin.entity.UserRole;
import coinproject.coin.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    java.util.List<UserRole> findByUserId(String userId);
    void deleteByUserId(String userId);
}
