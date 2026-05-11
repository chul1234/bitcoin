package coinproject.coin.service;

import coinproject.coin.entity.User;
import coinproject.coin.entity.UserAsset;
import coinproject.coin.repository.UserAssetRepository;
import coinproject.coin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AssetService {

    private final UserAssetRepository userAssetRepository;
    private final UserRepository userRepository;

    /**
     * 유저의 보유 자산 전체 목록을 조회합니다.
     */
    @Transactional(readOnly = true)
    public List<UserAsset> getUserAssets(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        return userAssetRepository.findByUser(user);
    }

    /**
     * 유저의 특정 자산(KRW, BTC 등) 잔고를 조회합니다.
     */
    @Transactional(readOnly = true)
    public Optional<UserAsset> getUserAsset(String userId, String currency) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
        return userAssetRepository.findByUserAndCurrency(user, currency);
    }

    /**
     * 초기에 원화(KRW) 지갑을 생성하고 시드머니를 지급합니다.
     * 이미 지갑이 존재하면 예외를 발생시킵니다.
     */
    @Transactional
    public UserAsset initKrwBalance(String userId, BigDecimal initialAmount) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        Optional<UserAsset> existingWallet = userAssetRepository.findByUserAndCurrency(user, "KRW");
        if (existingWallet.isPresent()) {
            throw new IllegalStateException("이미 원화 지갑이 존재합니다.");
        }

        UserAsset newAsset = UserAsset.builder()
                .user(user)
                .currency("KRW")
                .balance(initialAmount)
                .avgBuyPrice(BigDecimal.ONE) // 원화는 평단가 1로 고정
                .build();

        return userAssetRepository.save(newAsset);
    }
}
