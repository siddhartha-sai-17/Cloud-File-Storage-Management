package com.cloudstorage.backend.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class UploadConfig {

    @Value("${upload.default-chunk-size:5242880}")
    private long defaultChunkSize;

    @Value("${upload.min-chunk-size:262144}")
    private long minChunkSize;

    @Value("${upload.max-chunk-size:52428800}")
    private long maxChunkSize;

    @Value("${upload.max-file-size:52428800}")
    private long maxFileSize;

    @Value("${upload.session-expiration-hours:24}")
    private int sessionExpirationHours;

    @Value("${upload.temp-dir:uploads}")
    private String tempDir;

    @Value("${upload.retry.enabled:true}")
    private boolean retryEnabled;

    @Value("${upload.retry.max-attempts:5}")
    private int retryMaxAttempts;

    @Value("${upload.retry.initial-delay-ms:1000}")
    private long retryInitialDelayMs;

    @Value("${upload.retry.multiplier:2}")
    private double retryMultiplier;

    @Value("${upload.retry.max-delay-ms:30000}")
    private long retryMaxDelayMs;

    @Value("${upload.retry.jitter:true}")
    private boolean retryJitter;

    @Value("${upload.parallel.enabled:true}")
    private boolean parallelEnabled;

    @Value("${upload.parallel.max-workers:16}")
    private int parallelMaxWorkers;

    @Value("${upload.parallel.max-chunks-per-session:8}")
    private int parallelMaxChunksPerSession;

    @Value("${upload.parallel.executor-queue:500}")
    private int parallelExecutorQueue;

    @Value("${upload.queue.enabled:true}")
    private boolean queueEnabled;

    @Value("${upload.queue.max-size:1000}")
    private int queueMaxSize;

    @Value("${upload.queue.default-priority:NORMAL}")
    private String queueDefaultPriority;

    @Value("${upload.queue.high-priority-slots:4}")
    private int queueHighPrioritySlots;

    @Value("${upload.queue.normal-priority-slots:8}")
    private int queueNormalPrioritySlots;

    @Value("${upload.queue.low-priority-slots:4}")
    private int queueLowPrioritySlots;

    @Value("${upload.queue.starvation-threshold-ms:30000}")
    private long queueStarvationThresholdMs;

    @Value("${upload.progress.enabled:true}")
    private boolean progressEnabled;

    @Value("${upload.progress.broadcast-interval-ms:500}")
    private long progressBroadcastIntervalMs;

    @Value("${upload.progress.db-update-interval-ms:1000}")
    private long progressDbUpdateIntervalMs;

    @Value("${upload.progress.websocket.enabled:true}")
    private boolean progressWebsocketEnabled;

    @Value("${upload.progress.max-subscribers:5000}")
    private int progressMaxSubscribers;

    @Value("${upload.audit.retention-days:30}")
    private int auditRetentionDays;

    @Value("${upload.history.retention-days:90}")
    private int historyRetentionDays;

    @Value("${upload.audit.cleanup-cron:0 0 2 * * ?}")
    private String auditCleanupCron;

    @Value("${upload.performance.buffer-size:65536}")
    private int performanceBufferSize;

    @Value("${upload.performance.buffer-pool-size:256}")
    private int performanceBufferPoolSize;

    @Value("${upload.performance.batch-size:100}")
    private int performanceBatchSize;

    @Value("${upload.performance.enable-buffer-pooling:true}")
    private boolean performanceEnableBufferPooling;

    @Value("${upload.performance.enable-streaming:true}")
    private boolean performanceEnableStreaming;

    @Value("${upload.performance.enable-batching:true}")
    private boolean performanceEnableBatching;

    @Value("${upload.performance.enable-filechannel:true}")
    private boolean performanceEnableFileChannel;

    @Value("${upload.performance.enable-zero-copy:false}")
    private boolean performanceEnableZeroCopy;

    @Value("${upload.performance.executor-core-size:16}")
    private int performanceExecutorCoreSize;

    @Value("${upload.performance.executor-max-size:64}")
    private int performanceExecutorMaxSize;

    @Value("${upload.performance.executor-queue:5000}")
    private int performanceExecutorQueue;

    public RetryPolicy getRetryPolicy() {
        return RetryPolicy.builder()
                .maxAttempts(retryMaxAttempts)
                .initialDelay(retryInitialDelayMs)
                .multiplier(retryMultiplier)
                .maxDelay(retryMaxDelayMs)
                .jitterEnabled(retryJitter)
                .build();
    }
}
