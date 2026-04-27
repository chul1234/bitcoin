package coinproject.coin.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_roles")
@IdClass(UserRoleId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserRole {

    @Id
    @Column(name = "user_id")
    private String userId; // users 테이블의 user_id (로그인 아이디)

    @Id
    @Column(name = "role_id")
    private String roleId; // roles 테이블의 id
}
