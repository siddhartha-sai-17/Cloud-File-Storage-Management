package com.cloudstorage.backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TrashCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(TrashCleanupScheduler.class);
    private final TrashService trashService;

    @Value("${trash.retention.days:30}")
    private int retentionDays;

    @Scheduled(cron = "0 30 1 * * ?") // 1:30 AM nightly
    public void cleanupOldTrash() {
        logger.info("Starting auto-cleanup for soft-deleted items older than {} days...", retentionDays);
        try {
            trashService.autoCleanup(retentionDays);
            logger.info("Soft-deleted items auto-cleanup finished successfully.");
        } catch (Exception e) {
            logger.error("Error during soft-deleted items auto-cleanup: {}", e.getMessage(), e);
        }
    }
}
