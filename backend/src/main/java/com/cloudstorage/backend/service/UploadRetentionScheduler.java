package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.entity.UploadSessionStatus;
import com.cloudstorage.backend.repository.UploadAuditRepository;
import com.cloudstorage.backend.repository.UploadChunkRepository;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UploadRetentionScheduler {

    private static final Logger logger = LoggerFactory.getLogger(UploadRetentionScheduler.class);

    private final UploadConfig uploadConfig;
    private final UploadAuditRepository uploadAuditRepository;
    private final UploadSessionRepository uploadSessionRepository;
    private final UploadChunkRepository uploadChunkRepository;
    private final UploadAuditService uploadAuditService;

    @Scheduled(cron = "${upload.audit.cleanup-cron:0 0 2 * * ?}")
    @Transactional
    public void runCleanup() {
        logger.info("Starting upload history and audit log retention cleanup...");
        long startTime = System.currentTimeMillis();

        int auditDeleted = 0;
        int sessionsDeleted = 0;
        int chunksDeleted = 0;

        try {
            // 1. Audit logs cleanup
            LocalDateTime auditThreshold = LocalDateTime.now().minusDays(uploadConfig.getAuditRetentionDays());
            auditDeleted = uploadAuditRepository.deleteOlderThan(auditThreshold);
            logger.info("Deleted {} expired audit logs older than {}", auditDeleted, auditThreshold);

            // 2. Upload Sessions cleanup (Completed, Failed, Cancelled)
            LocalDateTime historyThreshold = LocalDateTime.now().minusDays(uploadConfig.getHistoryRetentionDays());
            List<UploadSessionStatus> cleanupStatuses = List.of(
                    UploadSessionStatus.COMPLETED,
                    UploadSessionStatus.FAILED,
                    UploadSessionStatus.CANCELLED
            );

            List<String> sessionIds = uploadSessionRepository.findSessionIdsForCleanup(cleanupStatuses, historyThreshold);
            if (!sessionIds.isEmpty()) {
                chunksDeleted = uploadChunkRepository.deleteBySessionIds(sessionIds);
                sessionsDeleted = uploadSessionRepository.deleteSessionByIds(sessionIds);
                logger.info("Deleted {} sessions and {} chunks older than {}", sessionsDeleted, chunksDeleted, historyThreshold);
            }

            long duration = System.currentTimeMillis() - startTime;
            logger.info("Retention cleanup completed successfully in {} ms.", duration);

            uploadAuditService.logEvent(
                    "SYSTEM",
                    "SYSTEM",
                    "HISTORY_CLEANUP",
                    "SUCCESS",
                    String.format("Deleted %d audit logs, %d sessions, and %d chunks.", auditDeleted, sessionsDeleted, chunksDeleted),
                    duration
            );
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Error occurred during retention cleanup", e);
            uploadAuditService.logEvent(
                    "SYSTEM",
                    "SYSTEM",
                    "HISTORY_CLEANUP",
                    "FAILURE",
                    "Error: " + e.getMessage(),
                    duration
            );
        }
    }
}
