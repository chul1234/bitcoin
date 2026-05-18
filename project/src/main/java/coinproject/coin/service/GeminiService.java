package coinproject.coin.service;

import coinproject.coin.dto.GeminiRequest;
import coinproject.coin.dto.GeminiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    // 사용할 모델 버전에 맞춘 구글 API 엔드포인트 URL
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=";

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 제미나이에게 프롬프트(질문)를 던지고 텍스트 응답을 받아오는 핵심 통신 메서드
     * @param prompt 포장된 지시문
     * @return 구글이 답변한 텍스트 (또는 에러 시 null)
     */
    public String askGemini(String prompt) {
        String url = GEMINI_API_URL + geminiApiKey;

        // 1. 헤더 설정 (우리는 JSON으로 대화할 것이다)
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 2. 요청 바디(Body) 포장
        GeminiRequest requestBody = new GeminiRequest(prompt);
        HttpEntity<GeminiRequest> entity = new HttpEntity<>(requestBody, headers);

        try {
            // 3. 구글에 요청 발사 및 응답 대기
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(url, entity, GeminiResponse.class);

            // 4. 응답 구조 까보기
            if (response.getBody() != null 
                && response.getBody().getCandidates() != null 
                && !response.getBody().getCandidates().isEmpty()) {
                
                // 구글이 준 긴 대답 구조체에서 진짜 '텍스트' 알맹이만 쏙 빼서 리턴
                return response.getBody().getCandidates().get(0).getContent().getParts().get(0).getText();
            }
        } catch (Exception e) {
            log.error("제미나이 API 통신 중 에러 발생: {}", e.getMessage());
            // TODO: Fallback - 에러가 나더라도 서버가 터지면 안 되므로 null을 리턴 (호출부에서 방어)
        }

        return null; // 실패 시
    }
}
