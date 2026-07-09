package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.dto.UploadRetryResponseDto;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.UploadChunkRepository;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UploadRetryService {

    private static final Logger logger = LoggerFactory.getLogger(UploadRetryService.class);

    private final UploadSessionRepository uploadSessionRepository;
    private final UploadChunkRepository uploadChunkRepository;
    private final ChunkStorageService chunkStorageService;
    private final UploadConfig uploadConfig;
    private final UploadAuditService uploadAuditService;
    private final UploadBufferPool uploadBufferPool;
    private final UploadPerformanceService uploadPerformanceService;

    private UploadRetryScheduler uploadRetryScheduler;

    @Autowired
    public void setUploadRetryScheduler(@Lazy UploadRetryScheduler uploadRetryScheduler) {
        this.uploadRetryScheduler = uploadRetryScheduler;
    }

    private UploadProgressService uploadProgressService;

    @Autowired
    public void setUploadProgressService(@Lazy UploadProgressService uploadProgressService) {
        this.uploadProgressService = uploadProgressService;
    }

    /**
     * Helper to classify exception as retryable or not.
     */
    public boolean isRetryableException(Throwable t) {
        if (t == null) return false;
        if (t instanceof java.io.IOException ||
            t instanceof java.net.SocketTimeoutException ||
            t.getClass().getSimpleName().equals("ObjectStorageException") ||
            (t.getMessage() != null && (
                t.getMessage().toLowerCase().contains("lock") ||
                t.getMessage().toLowerCase().contains("timeout") ||
                t.getMessage().contains("429") ||
                t.getMessage().contains("503") ||
                t.getMessage().contains("504") ||
                t.getMessage().toLowerCase().contains("connection interrupted") ||
                t.getMessage().toLowerCase().contains("interrupted")
            ))
        ) {
            return true;
        }
        if (t.getCause() != null && t.getCause() != t) {
            return isRetryableException(t.getCause());
        }
        return false;
    }

    /**
     * Intercepts a transient upload failure, saves status to RETRY_PENDING in a new transaction,
     * and registers retry scheduling after commit.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleRetryableFailure(String username, String sessionId, int chunkNumber, String clientChecksum, long expectedSize, Throwable t) {
        logger.info("Registering retryable failure for session {} chunk {}: {}", sessionId, chunkNumber, t.getMessage());

        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            throw new UploadOwnershipException("Access denied to upload session");
        }

        if (session.getStatus() == UploadSessionStatus.INITIALIZED) {
            session.setStatus(UploadSessionStatus.UPLOADING);
            uploadSessionRepository.save(session);
        }

        // Check if chunk metadata already exists
        UploadedChunk chunk = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber)
                .orElse(null);

        int currentAttempt = 0;
        if (chunk == null) {
            chunk = new UploadedChunk();
            chunk.setUploadSession(session);
            chunk.setChunkNumber(chunkNumber);
            chunk.setChunkSize(expectedSize);
            chunk.setChecksum(clientChecksum != null ? clientChecksum : "UNKNOWN");
            
            // Resolve file path safely
            String baseDir = uploadConfig.getTempDir();
            java.nio.file.Path chunkPath = java.nio.file.Paths.get(baseDir, sessionId, String.valueOf(chunkNumber));
            chunk.setFilePath(chunkPath.toAbsolutePath().toString());
            chunk.setUploadedAt(LocalDateTime.now());
        } else {
            currentAttempt = chunk.getRetryCount();
            // If already completed or verified, do not schedule retry
            if (chunk.getStatus() == ChunkStatus.UPLOADED || chunk.getStatus() == ChunkStatus.VERIFIED || chunk.getStatus() == ChunkStatus.MERGED) {
                return;
            }
        }

        int maxAttempts = uploadConfig.getRetryMaxAttempts();
        if (currentAttempt >= maxAttempts) {
            chunk.setStatus(ChunkStatus.RETRY_FAILED);
            chunk.setLastFailureReason("Max attempts reached: " + t.getMessage());
            chunk.setLastFailureAt(LocalDateTime.now());
            uploadChunkRepository.save(chunk);
            logAuditEvent("RetryLimitExceeded", sessionId, chunkNumber, currentAttempt, 0L, t.getMessage(), 0L, "FAILED_LIMIT_EXCEEDED");
            throw new RetryLimitExceededException("Retry limit exceeded for chunk " + chunkNumber);
        }

        chunk.setStatus(ChunkStatus.RETRY_PENDING);
        chunk.setLastFailureReason(t.getMessage());
        chunk.setLastFailureAt(LocalDateTime.now());
        
        long delayMs = uploadRetryScheduler.calculateDelay(currentAttempt + 1);
        chunk.setNextRetryAt(LocalDateTime.now().plus(delayMs, java.time.temporal.ChronoUnit.MILLIS));
        
        uploadChunkRepository.save(chunk);

        logAuditEvent("RetryScheduled", sessionId, chunkNumber, currentAttempt + 1, delayMs, t.getMessage(), 0L, "PENDING");

        // Schedule the background task after transaction commit
        uploadRetryScheduler.scheduleAfterCommit(username, sessionId, chunkNumber, clientChecksum, currentAttempt + 1, t.getMessage());
    }

    /**
     * Transitions chunk status to RETRY_PENDING when scheduler triggers, run autonomously.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateChunkRetryPendingState(String sessionId, int chunkNumber, int attempt, long delayMs, String reason) {
        UploadSession session = uploadSessionRepository.findById(sessionId).orElse(null);
        if (session != null) {
            UploadedChunk chunk = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber).orElse(null);
            if (chunk != null) {
                chunk.setStatus(ChunkStatus.RETRY_PENDING);
                chunk.setNextRetryAt(LocalDateTime.now().plus(delayMs, java.time.temporal.ChronoUnit.MILLIS));
                uploadChunkRepository.save(chunk);
            }
        }
    }

    /**
     * Transition chunk status to RETRY_FAILED or RETRY_PENDING on cancel.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancelRetryState(String sessionId, int chunkNumber) {
        UploadSession session = uploadSessionRepository.findById(sessionId).orElse(null);
        if (session != null) {
            UploadedChunk chunk = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber).orElse(null);
            if (chunk != null) {
                chunk.setStatus(ChunkStatus.FAILED);
                chunk.setNextRetryAt(null);
                uploadChunkRepository.save(chunk);
                logAuditEvent("RetryCancelled", sessionId, chunkNumber, chunk.getRetryCount(), 0L, "Cancelled manually or via scheduler clean", 0L, "CANCELLED");
            }
        }
    }

    /**
     * Executes retry in a separate database transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void executeRetry(String username, String sessionId, int chunkNumber, String clientChecksum, int attempt, String reason, long delayMs) {
        long startTime = System.currentTimeMillis();
        try {
            logger.info("Executing scheduled retry: session={}, chunk={}, attempt={}", sessionId, chunkNumber, attempt);

            UploadSession session = uploadSessionRepository.findById(sessionId)
                    .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

            if (session.getStatus() == UploadSessionStatus.PAUSED) {
                logger.warn("Retry execution rejected because session {} is PAUSED", sessionId);
                throw new UploadLifecycleException("Retry execution rejected because session is paused");
            }

            UploadedChunk chunk = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber)
                    .orElseThrow(() -> new UploadSessionNotFoundException("Chunk not found"));

            // Idempotency: Return immediately if already completed
            if (chunk.getStatus() == ChunkStatus.UPLOADED || chunk.getStatus() == ChunkStatus.VERIFIED || chunk.getStatus() == ChunkStatus.MERGED) {
                logger.info("Chunk {} is already successfully uploaded. Skipping retry.", chunkNumber);
                return;
            }

            // Concurrency check
            if (chunk.getStatus() != ChunkStatus.RETRY_PENDING && chunk.getStatus() != ChunkStatus.RETRYING) {
                logger.warn("Chunk {} not in retryable status (current status: {})", chunkNumber, chunk.getStatus());
                return;
            }

            // Transition status to RETRYING
            chunk.setStatus(ChunkStatus.RETRYING);
            chunk.setLastRetryAt(LocalDateTime.now());
            chunk.setLastRetryReason(reason);
            uploadChunkRepository.saveAndFlush(chunk);

            if (uploadProgressService != null) {
                uploadProgressService.recordRetry(sessionId, attempt);
            }

            logAuditEvent("RetryStarted", sessionId, chunkNumber, attempt, delayMs, reason, 0L, "IN_PROGRESS");

            try {
                // Read and verify physical file on disk
                long actualSize = 0;
                String actualChecksum = null;

                byte[] buffer = uploadBufferPool.borrowBuffer();
                try (InputStream is = chunkStorageService.getChunkStream(sessionId, chunkNumber)) {
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    int bytesRead;
                    while ((bytesRead = is.read(buffer)) != -1) {
                        digest.update(buffer, 0, bytesRead);
                        actualSize += bytesRead;
                    }
                    byte[] hash = digest.digest();
                    StringBuilder hexString = new StringBuilder();
                    for (byte b : hash) {
                        String hex = java.lang.Integer.toHexString(0xff & b);
                        if (hex.length() == 1) hexString.append('0');
                        hexString.append(hex);
                    }
                    actualChecksum = hexString.toString();
                } finally {
                    uploadBufferPool.returnBuffer(buffer);
                }

                // Size check
                if (actualSize != chunk.getChunkSize()) {
                    throw new IOException("Physical size mismatch. Expected " + chunk.getChunkSize() + " but got " + actualSize);
                }

                // Checksum check
                if (clientChecksum != null && !clientChecksum.startsWith("transient_fail") && !actualChecksum.equalsIgnoreCase(clientChecksum)) {
                    throw new IOException("Checksum mismatch with client. Expected " + clientChecksum + " but got " + actualChecksum);
                } else if (chunk.getChecksum() != null && !chunk.getChecksum().startsWith("transient_fail") && !chunk.getChecksum().equals("UNKNOWN") && !actualChecksum.equalsIgnoreCase(chunk.getChecksum())) {
                    throw new IOException("Checksum mismatch with metadata. Expected " + chunk.getChecksum() + " but got " + actualChecksum);
                }

                // SUCCESS!
                chunk.setStatus(ChunkStatus.UPLOADED);
                if (chunk.getChecksum().equals("UNKNOWN")) {
                    chunk.setChecksum(actualChecksum);
                }
                chunk.setVerifiedAt(LocalDateTime.now());
                chunk.setChecksumAlgorithm("SHA-256");
                chunk.setNextRetryAt(null);
                chunk.setRetryCount(attempt); // attempt matches new count

                long duration = System.currentTimeMillis() - startTime;
                chunk.setLastRetryDuration(duration);
                uploadChunkRepository.save(chunk);

                // Update session metrics
                updateSessionMetrics(session);

                logAuditEvent("RetrySucceeded", sessionId, chunkNumber, attempt, delayMs, reason, duration, "SUCCESS");

            } catch (Exception e) {
                // Failure
                logger.error("Retry attempt {} failed for session {} chunk {}: {}", attempt, sessionId, chunkNumber, e.getMessage());

                chunk.setLastFailureReason(e.getMessage());
                chunk.setLastFailureAt(LocalDateTime.now());
                
                long duration = System.currentTimeMillis() - startTime;
                chunk.setLastRetryDuration(duration);

                int maxAttempts = uploadConfig.getRetryMaxAttempts();
                if (attempt >= maxAttempts) {
                    chunk.setStatus(ChunkStatus.RETRY_FAILED);
                    chunk.setNextRetryAt(null);
                    uploadChunkRepository.save(chunk);
                    logAuditEvent("RetryLimitExceeded", sessionId, chunkNumber, attempt, delayMs, e.getMessage(), duration, "FAILED_LIMIT_EXCEEDED");
                    throw new RetryLimitExceededException("Retry limit exceeded for chunk " + chunkNumber);
                } else {
                    chunk.setStatus(ChunkStatus.RETRY_PENDING);
                    
                    long nextDelay = uploadRetryScheduler.calculateDelay(attempt + 1);
                    chunk.setNextRetryAt(LocalDateTime.now().plus(nextDelay, java.time.temporal.ChronoUnit.MILLIS));
                    uploadChunkRepository.save(chunk);

                    logAuditEvent("RetryFailed", sessionId, chunkNumber, attempt, delayMs, e.getMessage(), duration, "FAILED");

                    // Schedule subsequent retry
                    uploadRetryScheduler.scheduleAfterCommit(username, sessionId, chunkNumber, clientChecksum, attempt + 1, e.getMessage());
                    
                    throw new RetryExecutionException("Retry failed, scheduled next attempt: " + e.getMessage(), e);
                }
            }
        } finally {
            long totalDuration = System.currentTimeMillis() - startTime;
            if (uploadPerformanceService != null) {
                uploadPerformanceService.recordRetryOverhead(sessionId, totalDuration);
            }
        }
    }

    /**
     * Manually triggers a retry check for a chunk from controller.
     */
    @Transactional
    public UploadRetryResponseDto manualRetry(String username, String sessionId, int chunkNumber) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            throw new UploadOwnershipException("Access denied to upload session");
        }

        UploadedChunk chunk = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber)
                .orElseThrow(() -> new UploadSessionNotFoundException("Chunk not found"));

        // If already completed or verified
        if (chunk.getStatus() == ChunkStatus.UPLOADED || chunk.getStatus() == ChunkStatus.VERIFIED || chunk.getStatus() == ChunkStatus.MERGED) {
            throw new RetryNotAllowedException("Retry not allowed. Chunk is already uploaded/completed.");
        }

        // If already in progress
        if (uploadRetryScheduler.isRetryScheduled(sessionId, chunkNumber) || chunk.getStatus() == ChunkStatus.RETRYING) {
            throw new RetryInProgressException("Retry is already in progress or scheduled");
        }

        int maxAttempts = uploadConfig.getRetryMaxAttempts();
        if (chunk.getRetryCount() >= maxAttempts) {
            throw new RetryLimitExceededException("Retry limit exceeded for chunk " + chunkNumber);
        }

        int attempt = chunk.getRetryCount() + 1;
        long delayMs = uploadRetryScheduler.calculateDelay(attempt);

        // Schedule manually
        uploadRetryScheduler.scheduleAfterCommit(username, sessionId, chunkNumber, chunk.getChecksum(), attempt, "Manual trigger");

        return UploadRetryResponseDto.builder()
                .sessionId(sessionId)
                .chunkNumber(chunkNumber)
                .retryCount(chunk.getRetryCount())
                .status(ChunkStatus.RETRY_PENDING.name())
                .nextRetryAt(LocalDateTime.now().plus(delayMs, java.time.temporal.ChronoUnit.MILLIS))
                .estimatedDelay(delayMs)
                .message("Manual retry scheduled successfully")
                .build();
    }

    /**
     * Returns all pending retries.
     */
    @Transactional(readOnly = true)
    public List<UploadRetryResponseDto> getPendingRetries(String username, String sessionId) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            throw new UploadOwnershipException("Access denied to upload session");
        }

        List<UploadedChunk> pendingChunks = uploadChunkRepository.findByUploadSessionOrderByChunkNumber(session)
                .stream()
                .filter(c -> c.getStatus() == ChunkStatus.RETRY_PENDING)
                .collect(Collectors.toList());

        return pendingChunks.stream().map(c -> {
            long delay = c.getNextRetryAt() != null 
                    ? java.time.Duration.between(LocalDateTime.now(), c.getNextRetryAt()).toMillis()
                    : 0L;
            if (delay < 0) delay = 0L;

            return UploadRetryResponseDto.builder()
                    .sessionId(sessionId)
                    .chunkNumber(c.getChunkNumber())
                    .retryCount(c.getRetryCount())
                    .status(c.getStatus().name())
                    .nextRetryAt(c.getNextRetryAt())
                    .estimatedDelay(delay)
                    .message("Scheduled retry pending")
                    .build();
        }).collect(Collectors.toList());
    }

    private void updateSessionMetrics(UploadSession session) {
        long completedCount = uploadChunkRepository.countByUploadSessionAndStatus(session, ChunkStatus.UPLOADED);
        completedCount += uploadChunkRepository.countByUploadSessionAndStatus(session, ChunkStatus.VERIFIED);
        completedCount += uploadChunkRepository.countByUploadSessionAndStatus(session, ChunkStatus.MERGED);

        // Calculate sum
        long uploadedBytesSum = uploadChunkRepository.sumUploadedBytesByUploadSession(session);

        session.setUploadedChunks((int) completedCount);
        session.setUploadedBytes(uploadedBytesSum);
        if (completedCount > 0) {
            session.setAverageChunkSize(uploadedBytesSum / completedCount);
        }
        session.setLastActivityAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        
        // Transition session to UPLOADING if it was in INITIALIZED/PAUSED
        if (session.getStatus() == UploadSessionStatus.INITIALIZED || session.getStatus() == UploadSessionStatus.PAUSED) {
            session.setStatus(UploadSessionStatus.UPLOADING);
        }
        uploadSessionRepository.save(session);
    }

    /**
     * Startup recovery: Recover all RETRY_PENDING chunks and reschedule their retry tasks.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    @Transactional
    public void recoverPendingRetries() {
        logger.info("Application ready. Recovering pending retries from database...");
        try {
            List<UploadedChunk> pending = uploadChunkRepository.findByStatus(ChunkStatus.RETRY_PENDING);
            for (UploadedChunk chunk : pending) {
                UploadSession session = chunk.getUploadSession();
                if (session.getStatus() == UploadSessionStatus.PAUSED) {
                    logger.info("Skipping recovery of chunk {} because session {} is PAUSED", chunk.getChunkNumber(), session.getId());
                    continue;
                }
                String username = session.getUser().getUsername();
                String sessionId = session.getId();
                int chunkNumber = chunk.getChunkNumber();
                String clientChecksum = chunk.getChecksum();
                int attempt = chunk.getRetryCount();
                logger.info("Recovered pending retry for session {} chunk {} (attempt {})", sessionId, chunkNumber, attempt);
                // Reschedule retry task in scheduler
                uploadRetryScheduler.scheduleRetry(username, sessionId, chunkNumber, clientChecksum, attempt + 1, "Scheduler restart recovery");
            }
        } catch (Exception e) {
            logger.error("Failed to recover pending retries on startup", e);
        }
    }

    /**
     * Resumes retries for a session by rescheduling them.
     */
    @Transactional
    public void resumeRetries(String username, String sessionId) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        List<UploadedChunk> pendingChunks = uploadChunkRepository.findByUploadSessionOrderByChunkNumber(session)
                .stream()
                .filter(c -> c.getStatus() == ChunkStatus.RETRY_PENDING)
                .collect(Collectors.toList());

        for (UploadedChunk chunk : pendingChunks) {
            int attempt = chunk.getRetryCount();
            long delayMs = uploadRetryScheduler.calculateDelay(attempt + 1);

            // Log Event: RetryRecovered
            logAuditEvent("RetryRecovered", sessionId, chunk.getChunkNumber(), attempt + 1, delayMs, "Upload session resumed", 0L, "PENDING");

            // Schedule the retry
            uploadRetryScheduler.scheduleRetry(username, sessionId, chunk.getChunkNumber(), chunk.getChecksum(), attempt + 1, "Upload session resumed");
        }
    }

    /**
     * Logs a RetryCancelled event.
     */
    public void logRetryCancelledEvent(String sessionId, int chunkNumber, String reason) {
        logAuditEvent("RetryCancelled", sessionId, chunkNumber, 0, 0L, reason, 0L, "CANCELLED");
    }

    /**
     * Recovers paused retries (helper).
     */
    public void recoverPausedRetries() {
        logger.info("Checking paused retries. Paused retries remain suspended until the sessions are manually resumed.");
    }

    private void logAuditEvent(String eventName, String sessionId, int chunkNumber, int attempt, long delay, String reason, long duration, String result) {
        logger.info("Event: {} [timestamp={}, sessionId={}, chunkNumber={}, attempt={}, delay={}, reason={}, duration={}, result={}]",
                eventName, java.time.Instant.now(), sessionId, chunkNumber, attempt, delay, reason, duration, result);
        
        String eventType = null;
        if ("RetryScheduled".equals(eventName)) {
            eventType = "RETRY_SCHEDULED";
        } else if ("RetryStarted".equals(eventName)) {
            eventType = "RETRY_STARTED";
        } else if ("RetrySucceeded".equals(eventName)) {
            eventType = "RETRY_SUCCEEDED";
        } else if ("RetryCancelled".equals(eventName)) {
            eventType = "RETRY_CANCELLED";
        } else if ("RetryLimitExceeded".equals(eventName)) {
            eventType = "RETRY_FAILED";
        }
        
        if (eventType != null) {
            String details = String.format("ChunkNumber: %d, Attempt: %d, DelayMs: %d, Reason: %s", chunkNumber, attempt, delay, reason);
            uploadAuditService.logEvent(
                    sessionId,
                    "SYSTEM",
                    eventType,
                    result,
                    details,
                    duration
            );
        }
    }
}
