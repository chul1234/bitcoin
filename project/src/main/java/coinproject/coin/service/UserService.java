package coinproject.coin.service;

import coinproject.coin.entity.User;
import coinproject.coin.entity.UserRole;
import coinproject.coin.repository.UserRepository;
import coinproject.coin.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @jakarta.annotation.PostConstruct
    public void autoFixMissingRoles() {
        // DB에 직접 넣은 등 권한이 없는 유저를 위해 서버 시작 시 자동 복구
        java.util.List<User> users = userRepository.findAll();
        for (User user : users) {
            java.util.List<UserRole> roles = userRoleRepository.findByUserId(user.getUserId());
            if (roles == null || roles.isEmpty()) {
                userRoleRepository.save(new UserRole(user.getUserId(), "USER"));
            }
        }
    }

    /**
     * 회원 가입 시 기본으로 'USER' 권한 부여 로직 포함
     */
    @Transactional
    public User registerUser(String userId, String email, String password, String name) {
        
        // 1. 유저 아이디 / 이메일 중복 체크 (간단히)
        if (userRepository.findByUserId(userId).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        // 2. 새로운 사용자 저장
        User newUser = User.builder()
                .userId(userId)
                .email(email)
                .password(password) // 실제 환경에서는 PasswordEncoder로 암호화 필요
                .name(name)
                .build();
        
        User savedUser = userRepository.save(newUser);

        // 3. (핵심 로직) 가입된 사용자에게 무조건 기본 권한 'USER' 부여
        UserRole defaultRole = new UserRole(savedUser.getUserId(), "USER");
        userRoleRepository.save(defaultRole);

        return savedUser;
    }

    // --- 관리자 전용 로직 ---

    /**
     * 모든 사용자와 그들의 권한 정보를 함께 반환
     */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> getAllUsersWithRoles() {
        java.util.List<User> users = userRepository.findAll();
        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();

        for (User user : users) {
            java.util.List<UserRole> roles = userRoleRepository.findByUserId(user.getUserId());
            java.util.List<String> roleNames = roles.stream().map(UserRole::getRoleId).collect(java.util.stream.Collectors.toList());
            
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("userId", user.getUserId());
            map.put("name", user.getName());
            map.put("email", user.getEmail());
            map.put("roles", roleNames);
            result.add(map);
        }
        return result;
    }

    /**
     * 특정 사용자의 권한 일괄 업데이트
     */
    @Transactional
    public void updateUserRoles(String userId, java.util.List<String> newRoles) {
        // 기존 권한 싹 삭제
        userRoleRepository.deleteByUserId(userId);

        // 새 권한 등록
        if (newRoles != null) {
            for (String roleId : newRoles) {
                userRoleRepository.save(new UserRole(userId, roleId));
            }
        }
    }

    /**
     * 다중 사용자 일괄 등록 (관리자용)
     */
    @Transactional
    public void registerUsersBatch(java.util.List<java.util.Map<String, String>> usersData) {
        for (java.util.Map<String, String> data : usersData) {
            String userId = data.get("userId");
            if (userRepository.findByUserId(userId).isPresent()) {
                continue; // 이미 있는 아이디는 무시 (또는 에러 처리 가능)
            }
            registerUser(userId, data.get("email"), data.get("password"), data.get("name"));
        }
    }
}
