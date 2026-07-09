package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.AuditEvent;
import com.cloudstorage.backend.repository.AuditRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditRetentionScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AuditRetentionScheduler.class);

    private final AuditRepository auditRepository;
    private final com.cloudstorage.backend.repository.NotificationRepository notificationRepository;

    @Value("${audit.retention.days:90}")
    private int retentionDays;

    @Scheduled(cron = "${audit.retention.cron:0 0 2 * * ?}")
    @Transactional
    public void cleanupOldAuditLogs() {
        if (retentionDays <= 0) {
            return;
        }
        
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);
        logger.info("Starting audit log and notification cleanup. Deleting records older than {}", cutoffDate);

        Specification<AuditEvent> spec = (root, query, cb) -> cb.lessThan(root.get("createdAt"), cutoffDate);
        
        List<AuditEvent> oldEvents = auditRepository.findAll(spec);
        if (!oldEvents.isEmpty()) {
            auditRepository.deleteAllInBatch(oldEvents);
            logger.info("Deleted {} old audit events", oldEvents.size());
        } else {
            logger.info("No old audit events to delete");
        }

        // Cleanup old notifications
        List<com.cloudstorage.backend.entity.Notification> oldNotifications = notificationRepository.findAll().stream()
                .filter(n -> n.getCreatedAt() != null && n.getCreatedAt().isBefore(cutoffDate))
                .collect(java.util.stream.Collectors.toList());
        if (!oldNotifications.isEmpty()) {
            notificationRepository.deleteAllInBatch(oldNotifications);
            logger.info("Deleted {} old notifications", oldNotifications.size());
        }
    }
}
