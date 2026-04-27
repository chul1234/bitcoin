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
}
