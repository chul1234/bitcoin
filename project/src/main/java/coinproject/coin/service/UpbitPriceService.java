package coinproject.coin.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.List;
import java.util.Map.Entry;

@Service
public class UpbitPriceService {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 지정된 마켓(예: KRW-BTC, KRW-ETH)들의 현재가를 업비트에서 조회합니다.
     */
    public Map<String, BigDecimal> getCurrentPrices(Set<String> markets) {
        Map<String, BigDecimal> prices = new HashMap<>();
        if (markets == null || markets.isEmpty()) {
            return prices;
        }

        try {
            String marketsParam = String.join(",", markets);
            String url = "https://api.upbit.com/v1/ticker?markets=" + marketsParam;
            
            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> responseBody = response.getBody();
                for (Map<String, Object> item : responseBody) {
                    String market = (String) item.get("market");
                    // trade_price는 Number 타입으로 반환됨
                    Number tradePriceNum = (Number) item.get("trade_price");
                    if (tradePriceNum != null) {
                        prices.put(market, new BigDecimal(tradePriceNum.toString()));
                    }
                }
            }
        } catch (Exception e) {
            // 업비트 API 오류 발생 시 무시 (다음 스케줄러에서 재시도)
            System.err.println("업비트 시세 조회 오류: " + e.getMessage());
        }

        return prices;
    }

    /**
     * 지정된 마켓들의 전체 시세(Ticker) 데이터를 원본 JSON 문자열 형태로 반환합니다. (AI 분석용)
     */
    public String getRawTickerJson(Set<String> markets) {
        if (markets == null || markets.isEmpty()) {
            return "[]";
        }
        try {
            String marketsParam = String.join(",", markets);
            String url = "https://api.upbit.com/v1/ticker?markets=" + marketsParam;
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("업비트 Ticker JSON 조회 오류: " + e.getMessage());
        }
        return "[]";
    }
    /**
     * 업비트에 상장된 모든 원화(KRW) 마켓 목록을 조회합니다.
     */
    public List<String> getAllKrwMarkets() {
        try {
            String url = "https://api.upbit.com/v1/market/all?isDetails=false";
            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> responseBody = response.getBody();
                return responseBody.stream()
                        .map(item -> (String) item.get("market"))
                        .filter(market -> market.startsWith("KRW-"))
                        .collect(java.util.stream.Collectors.toList());
            }
        } catch (Exception e) {
            System.err.println("업비트 마켓 목록 조회 오류: " + e.getMessage());
        }
        return java.util.Collections.emptyList();
    }
}
