package coinproject.coin.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user_roles")
@IdClass(UserRoleId.class)
public class UserRole {

    @Id
    @Column(name = "user_id")
    private String userId; // users 테이블의 user_id (로그인 아이디)

    @Id
    @Column(name = "role_id")
    private String roleId; // roles 테이블의 id

    // 롬복이 동작하지 않을 때를 대비한 수동 생성자
    public UserRole() {}

    public UserRole(String userId, String roleId) {
        this.userId = userId;
        this.roleId = roleId;
    }

    // 수동 Getter / Setter
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }
}
