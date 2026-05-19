package coinproject.coin.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

@Configuration
@EnableScheduling
public class SchedulerConfig implements SchedulingConfigurer {

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        ThreadPoolTaskScheduler threadPoolTaskScheduler = new ThreadPoolTaskScheduler();
        threadPoolTaskScheduler.setPoolSize(5); // 쓰레드 풀 사이즈를 5개로 늘림 (동시 실행 가능)
        threadPoolTaskScheduler.setThreadNamePrefix("ai-scheduler-");
        threadPoolTaskScheduler.initialize();
        
        taskRegistrar.setTaskScheduler(threadPoolTaskScheduler);
    }
}
