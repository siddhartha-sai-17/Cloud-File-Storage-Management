package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import com.cloudstorage.backend.entity.UploadSession;
import com.cloudstorage.backend.entity.UploadSessionStatus;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.concurrent.*;

@Service
public class UploadRetryScheduler {

    private static final Logger logger = LoggerFactory.getLogger(UploadRetryScheduler.class);

    private final UploadConfig uploadConfig;
    private final UploadSessionRepository uploadSessionRepository;
    private final ScheduledExecutorService scheduledExecutor;
    private final Map<String, ScheduledFuture<?>> activeRetries = new ConcurrentHashMap<>();

    public UploadRetryScheduler(UploadConfig uploadConfig, UploadSessionRepository uploadSessionRepository) {
        this.uploadConfig = uploadConfig;
        this.uploadSessionRepository = uploadSessionRepository;
        int poolSize = uploadConfig.getPerformanceExecutorCoreSize() > 0 
                ? uploadConfig.getPerformanceExecutorCoreSize() / 4 
                : 4;
        if (poolSize < 1) {
            poolSize = 1;
        }
        this.scheduledExecutor = Executors.newScheduledThreadPool(poolSize, new ThreadFactory() {
            private final java.util.concurrent.atomic.AtomicInteger count = new java.util.concurrent.atomic.AtomicInteger(1);
            @Override
            public Thread newThread(Runnable r) {
                return new Thread(r, "retry-scheduler-worker-" + count.getAndIncrement());
            }
        });
    }

    private UploadRetryService uploadRetryService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setUploadRetryService(@org.springframework.context.annotation.Lazy UploadRetryService uploadRetryService) {
        this.uploadRetryService = uploadRetryService;
    }

    private String getKey(String sessionId, int chunkNumber) {
        return sessionId + "_" + chunkNumber;
    }

    /**
     * Schedules a retry task to run after the calculated delay.
     * Guaranteed to be thread-safe.
     */
    public synchronized void scheduleRetry(String username, String sessionId, int chunkNumber, String clientChecksum, int attempt, String reason) {
        if (!uploadConfig.isRetryEnabled()) {
            logger.warn("Retry is disabled in config. Skipping schedule for session {} chunk {}", sessionId, chunkNumber);
            return;
        }

        // Skip if session is PAUSED
        UploadSession session = uploadSessionRepository.findById(sessionId).orElse(null);
        if (session != null && session.getStatus() == UploadSessionStatus.PAUSED) {
            logger.warn("Session {} is PAUSED. Skipping retry scheduling for chunk {}", sessionId, chunkNumber);
            return;
        }

        String key = getKey(sessionId, chunkNumber);
        if (activeRetries.containsKey(key)) {
            logger.warn("Retry task already scheduled for session {} chunk {}", sessionId, chunkNumber);
            return;
        }

        long delayMs = calculateDelay(attempt);
        logger.info("Scheduling retry for session {} chunk {} (attempt {}) in {} ms. Reason: {}", 
                sessionId, chunkNumber, attempt, delayMs, reason);

        // Transition the chunk's status to RETRY_PENDING when scheduling
        uploadRetryService.updateChunkRetryPendingState(sessionId, chunkNumber, attempt, delayMs, reason);

        ScheduledFuture<?> future = scheduledExecutor.schedule(() -> {
            try {
                activeRetries.remove(key);
                uploadRetryService.executeRetry(username, sessionId, chunkNumber, clientChecksum, attempt, reason, delayMs);
            } catch (Exception e) {
                logger.error("Error executing scheduled retry for session {} chunk {}", sessionId, chunkNumber, e);
            }
        }, delayMs, TimeUnit.MILLISECONDS);

        activeRetries.put(key, future);
    }

    /**
     * Helper to schedule retry after transaction commits.
     */
    public void scheduleAfterCommit(String username, String sessionId, int chunkNumber, String clientChecksum, int attempt, String reason) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    scheduleRetry(username, sessionId, chunkNumber, clientChecksum, attempt, reason);
                }
            });
        } else {
            scheduleRetry(username, sessionId, chunkNumber, clientChecksum, attempt, reason);
        }
    }

    /**
     * Cancels an active scheduled retry.
     */
    public synchronized void cancelRetry(String sessionId, int chunkNumber) {
        String key = getKey(sessionId, chunkNumber);
        ScheduledFuture<?> future = activeRetries.remove(key);
        if (future != null) {
            future.cancel(true);
            logger.info("Cancelled scheduled retry for session {} chunk {}", sessionId, chunkNumber);
            uploadRetryService.cancelRetryState(sessionId, chunkNumber);
        }
    }

    /**
     * Cancels all active scheduled retry tasks for a paused session.
     */
    public synchronized void pauseRetries(String sessionId) {
        logger.info("Pausing retries for session {}", sessionId);
        java.util.List<String> keysToRemove = new java.util.ArrayList<>();
        for (String key : activeRetries.keySet()) {
            if (key.startsWith(sessionId + "_")) {
                keysToRemove.add(key);
            }
        }
        for (String key : keysToRemove) {
            ScheduledFuture<?> future = activeRetries.remove(key);
            if (future != null) {
                future.cancel(true);
                String[] parts = key.split("_");
                int chunkNumber = Integer.parseInt(parts[1]);
                logger.info("Cancelled scheduled retry task for key {} due to session pause", key);
                uploadRetryService.logRetryCancelledEvent(sessionId, chunkNumber, "Upload session paused");
            }
        }
    }

    /**
     * Resumes retries for a session by rescheduling them.
     */
    public void resumeRetries(String username, String sessionId) {
        uploadRetryService.resumeRetries(username, sessionId);
    }

    /**
     * Cancels all active scheduled retry tasks for a cancelled session.
     */
    public synchronized void cancelRetries(String sessionId) {
        logger.info("Cancelling retries for session {}", sessionId);
        java.util.List<String> keysToRemove = new java.util.ArrayList<>();
        for (String key : activeRetries.keySet()) {
            if (key.startsWith(sessionId + "_")) {
                keysToRemove.add(key);
            }
        }
        for (String key : keysToRemove) {
            ScheduledFuture<?> future = activeRetries.remove(key);
            if (future != null) {
                future.cancel(true);
                String[] parts = key.split("_");
                int chunkNumber = Integer.parseInt(parts[1]);
                logger.info("Cancelled scheduled retry task for key {} due to session cancellation", key);
                uploadRetryService.logRetryCancelledEvent(sessionId, chunkNumber, "Upload session cancelled");
            }
        }
    }

    /**
     * Recovers paused retries.
     */
    public void recoverPausedRetries() {
        uploadRetryService.recoverPausedRetries();
    }

    /**
     * Checks if a retry task is currently scheduled.
     */
    public boolean isRetryScheduled(String sessionId, int chunkNumber) {
        return activeRetries.containsKey(getKey(sessionId, chunkNumber));
    }

    /**
     * Calculates delay using exponential backoff with ±20% jitter.
     */
    public long calculateDelay(int attempt) {
        double multiplier = uploadConfig.getRetryMultiplier();
        long initialDelay = uploadConfig.getRetryInitialDelayMs();
        long maxDelay = uploadConfig.getRetryMaxDelayMs();

        // exponent is (attempt - 1)
        int exponent = Math.max(0, attempt - 1);
        long delay = (long) (initialDelay * Math.pow(multiplier, exponent));
        if (delay > maxDelay) {
            delay = maxDelay;
        }

        if (uploadConfig.isRetryJitter()) {
            double jitterFactor = ThreadLocalRandom.current().nextDouble(-0.2, 0.2);
            delay = (long) (delay + (delay * jitterFactor));
            if (delay < 0) {
                delay = 0;
            }
        }
        return delay;
    }

    @PreDestroy
    public void shutdown() {
        scheduledExecutor.shutdownNow();
    }
}
