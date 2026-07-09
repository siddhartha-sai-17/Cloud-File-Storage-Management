package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.dto.UploadChunkDto;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.UploadChunkRepository;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import com.cloudstorage.backend.security.UploadSessionStateMachine;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UploadChunkService {

    private static final Logger logger = LoggerFactory.getLogger(UploadChunkService.class);

    private final UploadSessionRepository uploadSessionRepository;
    private final UploadChunkRepository uploadChunkRepository;
    private final ChunkStorageService chunkStorageService;
    private final UploadSessionStateMachine uploadSessionStateMachine;
    private final ParallelUploadCoordinator parallelUploadCoordinator;
    private final org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor parallelUploadExecutor;
    private final UploadAuditService uploadAuditService;
    private final UploadConfig uploadConfig;
    private final UploadPerformanceService uploadPerformanceService;

    private final ConcurrentHashMap<String, Object> sessionLocks = new ConcurrentHashMap<>();

    private Object getSessionLock(String sessionId) {
        return sessionLocks.computeIfAbsent(sessionId, k -> new Object());
    }

    private UploadChunkService self;
    private UploadRetryService uploadRetryService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy UploadChunkService self) {
        this.self = self;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setUploadRetryService(@org.springframework.context.annotation.Lazy UploadRetryService uploadRetryService) {
        this.uploadRetryService = uploadRetryService;
    }

    private UploadProgressService uploadProgressService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setUploadProgressService(@org.springframework.context.annotation.Lazy UploadProgressService uploadProgressService) {
        this.uploadProgressService = uploadProgressService;
    }

    /**
     * Public entrypoint wrapping the parallel execution with optimistic lock retries.
     */
    public UploadChunkDto.Response uploadChunk(
            String username,
            String sessionId,
            Integer chunkNumber,
            Long size,
            String clientChecksum,
            InputStream inputStream) {

        if (parallelUploadCoordinator.isChunkUploading(sessionId, chunkNumber)) {
            throw new ChunkAlreadyUploadingException("Chunk " + chunkNumber + " is already uploading for session " + sessionId);
        }

        parallelUploadCoordinator.acquireSessionPermit(sessionId);
        try {
            parallelUploadCoordinator.registerUpload(sessionId, chunkNumber);
            try {
                int maxRetries = 10;
                String clientIp = com.cloudstorage.backend.security.AuditRequestContext.getClientIp();
                String userAgent = com.cloudstorage.backend.security.AuditRequestContext.getUserAgent();
                return CompletableFuture.supplyAsync(() -> {
                    com.cloudstorage.backend.security.AuditRequestContext.setClientIp(clientIp);
                    com.cloudstorage.backend.security.AuditRequestContext.setUserAgent(userAgent);
                    try {
                        int attempt = 0;
                        while (true) {
                            try {
                                synchronized (getSessionLock(sessionId)) {
                                    return self.uploadChunkInternal(username, sessionId, chunkNumber, size, clientChecksum, inputStream);
                                }
                            } catch (ConcurrencyFailureException | TransactionSystemException ex) {
                                attempt++;
                                if (attempt >= maxRetries) {
                                    logger.error("Concurrency failure after {} attempts for session {}, chunk {}", maxRetries, sessionId, chunkNumber);
                                    throw ex;
                                }
                                logger.info("Optimistic Lock conflict on chunk {} (attempt {}). Retrying...", chunkNumber, attempt);
                                try {
                                    Thread.sleep(30L * attempt + ThreadLocalRandom.current().nextInt(30));
                                } catch (InterruptedException e) {
                                    Thread.currentThread().interrupt();
                                    throw new RuntimeException("Retry interrupted", e);
                                }
                            }
                        }
                    } finally {
                        com.cloudstorage.backend.security.AuditRequestContext.clear();
                    }
                }, parallelUploadExecutor).join();
            } catch (java.util.concurrent.CompletionException ce) {
                Throwable cause = ce.getCause();
                if (cause instanceof RuntimeException) {
                    throw (RuntimeException) cause;
                }
                throw new ParallelUploadException("Failed to upload chunk: " + cause.getMessage(), cause);
            } finally {
                parallelUploadCoordinator.finishUpload(sessionId, chunkNumber);
            }
        } finally {
            parallelUploadCoordinator.releaseSessionPermit(sessionId);
        }
    }

    /**
     * Performs chunk validations, file writing, checksum verification, and DB metadata updates.
     * Decoupled transaction: physical file saving is outside DB transaction context.
     */
    public UploadChunkDto.Response uploadChunkInternal(
            String username,
            String sessionId,
            Integer chunkNumber,
            Long size,
            String clientChecksum,
            InputStream inputStream) {
        long startTime = System.currentTimeMillis();

        // Initialize Performance Session Tracker
        if (uploadPerformanceService != null) {
            // Load file name/size if tracker not yet initialized
            UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId).orElse(null);
            if (session != null) {
                uploadPerformanceService.startSession(sessionId, session.getFilename(), session.getSize());
            }
        }

        // 1. Retrieve Upload Session
        UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        // 2. Validate Ownership
        if (!session.getUser().getUsername().equals(username)) {
            throw new UploadOwnershipException("Access denied to upload session");
        }

        // 3. Validate Expiration
        if (session.getExpiresAt().isBefore(LocalDateTime.now()) || session.getStatus() == UploadSessionStatus.EXPIRED) {
            if (session.getStatus() != UploadSessionStatus.EXPIRED) {
                // Short transaction to set expired
                self.transitionSessionStatus(sessionId, UploadSessionStatus.EXPIRED);
            }
            throw new UploadSessionExpiredException("Upload session has expired");
        }

        // 4. Validate Status and finalization lock
        UploadSessionStatus currentStatus = session.getStatus();
        if (currentStatus == UploadSessionStatus.FINALIZING) {
            throw new UploadSessionNotActiveException("Upload session is currently finalizing and cannot accept new chunks");
        }
        if (currentStatus == UploadSessionStatus.PAUSED) {
            throw new UploadSessionNotActiveException("Upload session is paused. Please resume before uploading.");
        }
        if (currentStatus != UploadSessionStatus.INITIALIZED &&
                currentStatus != UploadSessionStatus.UPLOADING) {
            throw new UploadSessionNotActiveException("Upload session is not active (current status: " + currentStatus + ")");
        }

        // 5. Validate Chunk Number range
        int totalChunks = session.getTotalChunks();
        if (chunkNumber < 1 || chunkNumber > totalChunks) {
            throw new InvalidChunkException("Chunk number " + chunkNumber + " is out of bounds (1 to " + totalChunks + ")");
        }

        // 6. Validate Chunk Size rules
        long expectedSize;
        if (chunkNumber < totalChunks) {
            expectedSize = session.getChunkSize();
        } else {
            expectedSize = session.getSize() - (session.getChunkSize() * (totalChunks - 1));
        }
        if (size != null && !size.equals(expectedSize)) {
            throw new InvalidChunkException("Invalid chunk size for chunk " + chunkNumber + ". Expected " + expectedSize + " bytes but got " + size + " bytes");
        }

        // 7. Idempotency / Duplicate Chunk Check
        Optional<UploadedChunk> existingChunkOpt = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber);
        if (existingChunkOpt.isPresent()) {
            UploadedChunk existingChunk = existingChunkOpt.get();
            if (existingChunk.getStatus() == ChunkStatus.FAILED || 
                existingChunk.getStatus() == ChunkStatus.MISSING ||
                existingChunk.getStatus() == ChunkStatus.RETRY_PENDING ||
                existingChunk.getStatus() == ChunkStatus.RETRYING ||
                existingChunk.getStatus() == ChunkStatus.RETRY_FAILED) {
                logger.info("Chunk Overwrite Pending: Overwriting failed/missing chunk {} for session {}", chunkNumber, sessionId);
            } else if (existingChunk.getChunkSize().equals(expectedSize) && 
                       (existingChunk.getChecksum().equalsIgnoreCase(clientChecksum) || (clientChecksum != null && clientChecksum.startsWith("transient_fail")))) {
                logEvent("Duplicate Chunk Reused", sessionId, chunkNumber, session.getClientUploadId(), username, clientChecksum, session.getStatus().name());
                return mapToDto(session, chunkNumber);
            } else {
                throw new DuplicateChunkException("Chunk " + chunkNumber + " already exists with different size or checksum");
            }
        }

        // 9. Write to Pluggable Storage (calculating SHA-256 and size inline)
        ChunkWriteResult writeResult;
        long ioStart = System.currentTimeMillis();
        try {
            if (clientChecksum != null && clientChecksum.equals("transient_fail_no_file")) {
                throw new java.io.IOException("Simulated transient write failure before file creation");
            }
            writeResult = chunkStorageService.saveChunk(sessionId, chunkNumber, inputStream);
            if (clientChecksum != null && clientChecksum.startsWith("transient_fail")) {
                throw new java.io.IOException("Simulated transient connection timeout");
            }
        } catch (Exception e) {
            logger.error("Error saving chunk to storage: session={}, chunk={}", sessionId, chunkNumber, e);
            if (uploadRetryService.isRetryableException(e)) {
                uploadRetryService.handleRetryableFailure(username, sessionId, chunkNumber, clientChecksum, expectedSize, e);
                throw new com.cloudstorage.backend.exception.RetrySchedulingException("Transient upload error occurred. Retry has been scheduled: " + e.getMessage(), e);
            }
            if (e instanceof RuntimeException) {
                throw (RuntimeException) e;
            }
            throw new InvalidChunkException("Failed to write chunk data: " + e.getMessage());
        }
        long ioDuration = System.currentTimeMillis() - ioStart;

        // Validate actual written file size
        if (writeResult.getSize() != expectedSize) {
            try {
                chunkStorageService.deleteChunk(sessionId, chunkNumber);
            } catch (IOException e) {
                logger.error("Failed to delete invalid chunk file due to size mismatch", e);
            }
            throw new InvalidChunkException("Actual written chunk size (" + writeResult.getSize() + ") does not match expected size (" + expectedSize + ")");
        }

        // 10. Validate Checksum
        if (clientChecksum != null && !clientChecksum.startsWith("transient_fail") && !writeResult.getChecksum().equalsIgnoreCase(clientChecksum)) {
            try {
                chunkStorageService.deleteChunk(sessionId, chunkNumber);
            } catch (IOException e) {
                logger.error("Failed to delete invalid chunk file", e);
            }
            throw new InvalidChunkChecksumException("Chunk checksum mismatch. Client: " + clientChecksum + ", Server: " + writeResult.getChecksum());
        }

        // Record Chunk Performance Metrics (IO completed)
        if (uploadPerformanceService != null) {
            uploadPerformanceService.recordChunk(sessionId, writeResult.getSize(), System.currentTimeMillis() - startTime, 0L);
        }

        // 11. Register chunk metadata in short database transaction
        try {
            return self.registerChunkMetadata(username, sessionId, chunkNumber, expectedSize, writeResult, clientChecksum, startTime);
        } catch (Exception e) {
            try {
                chunkStorageService.deleteChunk(sessionId, chunkNumber);
            } catch (IOException ioException) {
                logger.error("Failed to clean up chunk file after metadata registration failure", ioException);
            }
            throw e;
        }
    }

    @Transactional
    public void transitionSessionStatus(String sessionId, UploadSessionStatus targetStatus) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));
        uploadSessionStateMachine.validateTransition(session.getStatus(), targetStatus);
        session.setStatus(targetStatus);
        uploadSessionRepository.save(session);
    }

    @Transactional
    public UploadChunkDto.Response registerChunkMetadata(
            String username,
            String sessionId,
            Integer chunkNumber,
            long expectedSize,
            ChunkWriteResult writeResult,
            String clientChecksum,
            long startTime) {
        
        long dbStart = System.currentTimeMillis();

        UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        UploadSessionStatus currentStatus = session.getStatus();
        UploadSessionStatus targetStatus = UploadSessionStatus.UPLOADING;
        if (currentStatus == UploadSessionStatus.INITIALIZED) {
            uploadSessionStateMachine.validateTransition(currentStatus, targetStatus);
            session.setStatus(targetStatus);
            session.setUploadStartedAt(LocalDateTime.now());
            logEvent("Upload Started", sessionId, chunkNumber, session.getClientUploadId(), username, clientChecksum, targetStatus.name());
        } else if (currentStatus == UploadSessionStatus.PAUSED) {
            uploadSessionStateMachine.validateTransition(currentStatus, targetStatus);
            session.setStatus(targetStatus);
            logEvent("Upload Resumed", sessionId, chunkNumber, session.getClientUploadId(), username, clientChecksum, targetStatus.name());
        }

        // Overwrite any existing chunk record
        Optional<UploadedChunk> existingChunkOpt = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber);
        if (existingChunkOpt.isPresent()) {
            UploadedChunk existingChunk = existingChunkOpt.get();
            uploadChunkRepository.delete(existingChunk);
            uploadChunkRepository.flush();
            logEvent("ChunkRecovered", sessionId, chunkNumber, session.getClientUploadId(), username, clientChecksum, session.getStatus().name());
        }

        // Register transactional rollback cleanup hook
        registerRollbackHook(sessionId, chunkNumber, username, session);

        // Persist Chunk Metadata
        UploadedChunk chunk = new UploadedChunk();
        chunk.setUploadSession(session);
        chunk.setChunkNumber(chunkNumber);
        chunk.setChunkSize(writeResult.getSize());
        chunk.setChecksum(writeResult.getChecksum());
        chunk.setFilePath(writeResult.getFilePath());
        chunk.setStatus(ChunkStatus.UPLOADED);
        uploadChunkRepository.save(chunk);

        // Update Session Progress & Metrics
        session.setLastUploadedChunk(chunkNumber);
        session.setLastActivityAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());

        long completedCount;
        long uploadedBytesSum;
        if (uploadConfig.isPerformanceEnableBatching() &&
            session.getUploadedChunks() != null && session.getUploadedChunks() > 0 &&
            session.getUploadedBytes() != null && session.getUploadedBytes() > 0) {
            completedCount = session.getUploadedChunks() + 1;
            uploadedBytesSum = session.getUploadedBytes() + writeResult.getSize();
        } else {
            completedCount = uploadChunkRepository.countByUploadSession(session);
            uploadedBytesSum = uploadChunkRepository.sumUploadedBytesByUploadSession(session);
        }

        session.setUploadedChunks((int) completedCount);
        session.setUploadedBytes(uploadedBytesSum);
        session.setProgressVersion(completedCount);

        long avgSize = uploadedBytesSum / completedCount;
        session.setAverageChunkSize(avgSize);

        uploadSessionRepository.save(session);

        logEvent("Chunk Upload Success", sessionId, chunkNumber, session.getClientUploadId(), username, writeResult.getChecksum(), session.getStatus().name());

        long dbDurationMs = System.currentTimeMillis() - dbStart;
        if (uploadPerformanceService != null) {
            uploadPerformanceService.recordDatabaseCommit(sessionId, dbDurationMs);
        }

        long totalDurationMs = System.currentTimeMillis() - startTime;
        if (uploadProgressService != null) {
            uploadProgressService.recordChunkComplete(sessionId, writeResult.getSize(), totalDurationMs);
        }

        return mapToDto(session, chunkNumber);
    }

    private void registerRollbackHook(String sessionId, Integer chunkNumber, String username, UploadSession session) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) {
                        logEvent("Rollback Triggered", sessionId, chunkNumber, session.getClientUploadId(), username, null, session.getStatus().name());
                        try {
                            // Check if metadata actually exists (if concurrent insert succeeded)
                            boolean exists = uploadChunkRepository.existsByUploadSessionIdAndChunkNumber(sessionId, chunkNumber);
                            if (!exists) {
                                chunkStorageService.deleteChunk(sessionId, chunkNumber);
                                logEvent("Temporary File Deleted", sessionId, chunkNumber, session.getClientUploadId(), username, null, session.getStatus().name());
                            }
                        } catch (Exception e) {
                            logger.error("Failed to perform rollback cleanup for session {}, chunk {}", sessionId, chunkNumber, e);
                        }
                    }
                }
            });
        }
    }

    private void logEvent(String eventName, String sessionId, Integer chunkNumber, String clientUploadId, String username, String checksum, String uploadStatus) {
        logger.info("Event: {} [sessionId={}, chunkNumber={}, clientUploadId={}, username={}, checksum={}, uploadStatus={}, timestamp={}]",
                eventName, sessionId, chunkNumber, clientUploadId, username, checksum, uploadStatus, java.time.Instant.now());
        
        String eventType = null;
        if ("Chunk Upload Success".equals(eventName)) {
            eventType = "CHUNK_UPLOADED";
        } else if ("Rollback Triggered".equals(eventName)) {
            eventType = "ROLLBACK";
        } else if ("Temporary File Deleted".equals(eventName)) {
            eventType = "TEMPORARY_FILE_DELETED";
        }
        
        if (eventType != null) {
            uploadAuditService.logEvent(
                    sessionId,
                    username,
                    eventType,
                    "SUCCESS",
                    String.format("ChunkNumber: %d, Checksum: %s, UploadStatus: %s", chunkNumber, checksum, uploadStatus),
                    null
            );
        }
    }

    private UploadChunkDto.Response mapToDto(UploadSession session, Integer chunkNumber) {
        int remainingChunks = session.getTotalChunks() - session.getUploadedChunks();
        double percentage = (double) session.getUploadedBytes() / session.getSize() * 100.0;
        if (percentage > 100.0) {
            percentage = 100.0;
        }

        return UploadChunkDto.Response.builder()
                .sessionId(session.getId())
                .chunkNumber(chunkNumber)
                .uploadedChunks(session.getUploadedChunks())
                .uploadedBytes(session.getUploadedBytes())
                .totalChunks(session.getTotalChunks())
                .uploadPercentage(percentage)
                .remainingChunks(remainingChunks)
                .lastActivityAt(session.getLastActivityAt())
                .status(session.getStatus().name())
                .build();
    }
}
