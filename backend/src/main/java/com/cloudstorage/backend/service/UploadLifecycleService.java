package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.UploadLifecycleResponseDto;
import com.cloudstorage.backend.entity.ChunkStatus;
import com.cloudstorage.backend.entity.UploadSession;
import com.cloudstorage.backend.entity.UploadSessionStatus;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.UploadChunkRepository;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UploadLifecycleService {

    private static final Logger logger = LoggerFactory.getLogger(UploadLifecycleService.class);

    private final UploadSessionRepository uploadSessionRepository;
    private final UploadChunkRepository uploadChunkRepository;
    private final UploadRetryScheduler uploadRetryScheduler;
    private final UploadProgressService uploadProgressService;
    private final UploadAuditService uploadAuditService;

    @Transactional
    public UploadLifecycleResponseDto pauseUpload(String username, String sessionId) {
        long startTime = System.currentTimeMillis();
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            logLifecycleEvent("PauseRejected", sessionId, username, "Access denied to session", 0L);
            throw new UploadOwnershipException("Access denied to upload session");
        }

        UploadSessionStatus currentStatus = session.getStatus();
        if (currentStatus == UploadSessionStatus.PAUSED) {
            logLifecycleEvent("PauseRejected", sessionId, username, "Session already paused", 0L);
            throw new UploadAlreadyPausedException("Upload session is already paused");
        }

        if (currentStatus != UploadSessionStatus.UPLOADING) {
            logLifecycleEvent("PauseRejected", sessionId, username, "Pause not allowed from status " + currentStatus, 0L);
            throw new UploadPauseNotAllowedException("Pausing is only allowed for active uploads (current status: " + currentStatus + ")");
        }

        // Transition status
        session.setStatus(UploadSessionStatus.PAUSED);
        LocalDateTime now = LocalDateTime.now();
        session.setPausedAt(now);
        session.setLastActivityAt(now);
        session.setLastPausedBy(username);
        
        uploadSessionRepository.save(session);

        // Cancel retry tasks after commit
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    uploadRetryScheduler.pauseRetries(sessionId);
                }
            });
        } else {
            uploadRetryScheduler.pauseRetries(sessionId);
        }

        long duration = System.currentTimeMillis() - startTime;
        logLifecycleEvent("UploadPaused", sessionId, username, "User requested pause", duration);

        if (uploadProgressService != null) {
            uploadProgressService.markPaused(sessionId);
        }

        return mapToLifecycleDto(session);
    }

    @Transactional
    public UploadLifecycleResponseDto resumeUpload(String username, String sessionId) {
        long startTime = System.currentTimeMillis();
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            logLifecycleEvent("ResumeRejected", sessionId, username, "Access denied to session", 0L);
            throw new UploadOwnershipException("Access denied to upload session");
        }

        UploadSessionStatus currentStatus = session.getStatus();
        if (currentStatus == UploadSessionStatus.UPLOADING || currentStatus == UploadSessionStatus.INITIALIZED) {
            logLifecycleEvent("ResumeRejected", sessionId, username, "Session is already active or initialized", 0L);
            throw new UploadNotPausedException("Upload session is not paused");
        }

        if (currentStatus != UploadSessionStatus.PAUSED) {
            logLifecycleEvent("ResumeRejected", sessionId, username, "Resume not allowed from status " + currentStatus, 0L);
            throw new UploadResumeNotAllowedException("Resuming is only allowed for paused uploads (current status: " + currentStatus + ")");
        }

        // Transition status
        session.setStatus(UploadSessionStatus.UPLOADING);
        LocalDateTime now = LocalDateTime.now();
        session.setResumedAt(now);
        session.setLastActivityAt(now);
        session.setResumeCount(session.getResumeCount() + 1);

        uploadSessionRepository.save(session);

        // Restart retry tasks after commit
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    uploadRetryScheduler.resumeRetries(username, sessionId);
                }
            });
        } else {
            uploadRetryScheduler.resumeRetries(username, sessionId);
        }

        long duration = System.currentTimeMillis() - startTime;
        logLifecycleEvent("UploadResumed", sessionId, username, "User requested resume", duration);

        if (uploadProgressService != null) {
            uploadProgressService.markResumed(sessionId);
        }

        return mapToLifecycleDto(session);
    }

    @Transactional(readOnly = true)
    public UploadLifecycleResponseDto getSessionStatus(String username, String sessionId) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            throw new UploadOwnershipException("Access denied to upload session");
        }

        return mapToLifecycleDto(session);
    }

    private void logLifecycleEvent(String eventName, String sessionId, String username, String reason, long duration) {
        logger.info("Event: {} [timestamp={}, sessionId={}, username={}, reason={}, duration={}]",
                eventName, java.time.Instant.now(), sessionId, username, reason, duration);
        
        String eventType = null;
        if ("UploadPaused".equals(eventName)) {
            eventType = "UPLOAD_PAUSED";
        } else if ("UploadResumed".equals(eventName)) {
            eventType = "UPLOAD_RESUMED";
        } else if ("PauseRejected".equals(eventName)) {
            eventType = "PAUSE_REJECTED";
        } else if ("ResumeRejected".equals(eventName)) {
            eventType = "RESUME_REJECTED";
        }
        
        if (eventType != null) {
            uploadAuditService.logEvent(
                    sessionId,
                    username,
                    eventType,
                    eventName.contains("Rejected") ? "FAILURE" : "SUCCESS",
                    reason,
                    duration
            );
        }
    }

    private UploadLifecycleResponseDto mapToLifecycleDto(UploadSession session) {
        int retryPendingCount = (int) uploadChunkRepository.findByUploadSessionOrderByChunkNumber(session)
                .stream()
                .filter(c -> c.getStatus() == ChunkStatus.RETRY_PENDING)
                .count();

        double pct = (session.getSize() > 0) ? ((double) session.getUploadedBytes() / session.getSize()) * 100.0 : 0.0;

        return UploadLifecycleResponseDto.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .uploadedChunks(session.getUploadedChunks())
                .uploadedBytes(session.getUploadedBytes())
                .remainingChunks(session.getTotalChunks() - session.getUploadedChunks())
                .uploadPercentage(pct)
                .pausedAt(session.getPausedAt())
                .resumedAt(session.getResumedAt())
                .lastActivityAt(session.getLastActivityAt())
                .retryPendingCount(retryPendingCount)
                .build();
    }
}
