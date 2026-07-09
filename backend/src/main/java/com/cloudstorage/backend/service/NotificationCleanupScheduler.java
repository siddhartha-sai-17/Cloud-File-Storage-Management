package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.Notification;
import com.cloudstorage.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(NotificationCleanupScheduler.class);
    private final NotificationRepository notificationRepository;

    @Scheduled(cron = "0 0 2 * * ?") // 2:00 AM nightly
    @Transactional
    public void cleanupOldNotifications() {
        logger.info("Starting notification cleanup (pruning read notifications older than 30 days)...");
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);

        List<Notification> oldNotifications = notificationRepository.findAll().stream()
                .filter(n -> n.isRead() && n.getCreatedAt() != null && n.getCreatedAt().isBefore(cutoff))
                .collect(Collectors.toList());

        if (!oldNotifications.isEmpty()) {
            notificationRepository.deleteAllInBatch(oldNotifications);
            logger.info("Deleted {} old read notifications", oldNotifications.size());
        } else {
            logger.info("No old read notifications to prune");
        }
    }
}
