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
    private final coinproject.coin.repository.OrderRepository orderRepository;

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

    /**
     * 유저의 투자 내역(주문 및 코인)을 삭제하고 KRW를 초기 금액으로 리셋합니다.
     */
    @Transactional
    public void resetUserInvestment(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        // 1. 모든 주문 내역 삭제
        orderRepository.deleteByUser(user);

        // 2. 원화(KRW)를 제외한 모든 코인 자산 삭제
        userAssetRepository.deleteByUserAndCurrencyNot(user, "KRW");

        // 3. 원화(KRW) 자산 잔액을 1000만 원으로 복구 (없으면 생성)
        Optional<UserAsset> krwWallet = userAssetRepository.findByUserAndCurrency(user, "KRW");
        if (krwWallet.isPresent()) {
            UserAsset asset = krwWallet.get();
            asset.setBalance(new BigDecimal("10000000"));
            userAssetRepository.save(asset);
        } else {
            UserAsset newAsset = UserAsset.builder()
                    .user(user)
                    .currency("KRW")
                    .balance(new BigDecimal("10000000"))
                    .avgBuyPrice(BigDecimal.ONE)
                    .build();
            userAssetRepository.save(newAsset);
        }
    }
}
