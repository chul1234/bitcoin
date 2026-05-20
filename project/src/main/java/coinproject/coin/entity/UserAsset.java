package coinproject.coin.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "user_assets", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "currency"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 사용자님의 users 테이블 id(PK)를 참조합니다. 
    // 간섭 최소화를 위해 JoinColumn 대신 기본 타입으로 매핑하거나 지연 로딩을 사용합니다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 20, nullable = false)
    private String currency; // 예: KRW, BTC, ETH 등

    @Column(precision = 30, scale = 8, nullable = false)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "avg_buy_price", precision = 30, scale = 8, nullable = false)
    @Builder.Default
    private BigDecimal avgBuyPrice = BigDecimal.ZERO;

    // VS Code (IDE) Lombok 인식 지연으로 인한 빨간 줄(에러 표시) 방지용 명시적 Getter/Setter
    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getCurrency() {
        return currency;
    }

    public BigDecimal getAvgBuyPrice() {
        return avgBuyPrice;
    }

    public void setAvgBuyPrice(BigDecimal avgBuyPrice) {
        this.avgBuyPrice = avgBuyPrice;
    }
}
