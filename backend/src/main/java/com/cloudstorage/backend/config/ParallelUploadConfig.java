package com.cloudstorage.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@RequiredArgsConstructor
public class ParallelUploadConfig {

    private final UploadConfig uploadConfig;

    @Bean(name = "parallelUploadExecutor")
    public ThreadPoolTaskExecutor parallelUploadExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // Externalize configuration from UploadConfig
        executor.setCorePoolSize(uploadConfig.getPerformanceExecutorCoreSize() > 0 
                ? uploadConfig.getPerformanceExecutorCoreSize() 
                : uploadConfig.getParallelMaxWorkers() / 2);
        executor.setMaxPoolSize(uploadConfig.getPerformanceExecutorMaxSize() > 0 
                ? uploadConfig.getPerformanceExecutorMaxSize() 
                : uploadConfig.getParallelMaxWorkers());
        executor.setQueueCapacity(uploadConfig.getPerformanceExecutorQueue() > 0 
                ? uploadConfig.getPerformanceExecutorQueue() 
                : uploadConfig.getParallelExecutorQueue());
        executor.setThreadNamePrefix("parallel-upload-worker-");
        
        // Rejection Policy: CallerRunsPolicy allows calling thread to handle execution if saturated
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        // Graceful shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
