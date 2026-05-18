package coinproject.coin.dto;

import lombok.Data;
import java.util.List;

/**
 * 구글 Gemini API 응답용 DTO
 */
@Data
public class GeminiResponse {
    
    private List<Candidate> candidates;

    @Data
    public static class Candidate {
        private Content content;
    }

    @Data
    public static class Content {
        private List<Part> parts;
    }

    @Data
    public static class Part {
        private String text;
    }
}
