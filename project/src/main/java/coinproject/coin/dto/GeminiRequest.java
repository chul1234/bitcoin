package coinproject.coin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * 구글 Gemini API로 전송할 JSON 요청 규격에 맞춘 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GeminiRequest {

    private List<Content> contents;

    // 생성자: 단순히 텍스트만 넣으면 알아서 구글 규격에 맞게 리스트를 생성해 포장함
    public GeminiRequest(String text) {
        Part part = new Part(text);
        Content content = new Content(Collections.singletonList(part));
        this.contents = Collections.singletonList(content);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Content {
        private List<Part> parts;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Part {
        private String text;
    }
}
