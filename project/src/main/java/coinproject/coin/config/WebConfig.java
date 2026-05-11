package coinproject.coin.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 프로젝트 루트 아래의 uploads 폴더 절대 경로 추출
        Path uploadDir = Paths.get("./uploads").toAbsolutePath().normalize();
        
        // /uploads/** 요청이 들어오면 실제 로컬의 uploads 폴더에서 파일을 찾아서 서빙
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir.toString() + "/");
    }
}
