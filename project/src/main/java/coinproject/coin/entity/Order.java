package coinproject.coin.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 20, nullable = false)
    private String market; // 예: KRW-BTC

    @Column(length = 10, nullable = false)
    private String side; // BUY, SELL

    @Column(name = "order_type", length = 20, nullable = false)
    private String orderType; // LIMIT, MARKET, STOP_LIMIT

    @Column(precision = 30, scale = 8, nullable = false)
    private BigDecimal price;

    @Column(precision = 30, scale = 8, nullable = false)
    private BigDecimal volume;

    @Column(name = "trigger_price", precision = 30, scale = 8)
    private BigDecimal triggerPrice;

    @Column(length = 20, nullable = false)
    @Builder.Default
    private String state = "WAIT"; // WAIT, DONE, CANCEL

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
