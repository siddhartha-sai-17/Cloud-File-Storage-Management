package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.ShareLink;
import com.cloudstorage.backend.repository.ShareLinkRepository;
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
public class ShareCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ShareCleanupScheduler.class);
    private final ShareLinkRepository shareLinkRepository;

    @Scheduled(cron = "0 0 1 * * ?") // 1:00 AM nightly
    @Transactional
    public void cleanupExpiredShares() {
        logger.info("Starting expired share links cleanup...");
        LocalDateTime now = LocalDateTime.now();
        List<ShareLink> expired = shareLinkRepository.findAll().stream()
                .filter(s -> s.isActive() && s.getExpiresAt() != null && s.getExpiresAt().isBefore(now))
                .collect(Collectors.toList());

        if (!expired.isEmpty()) {
            for (ShareLink s : expired) {
                s.setActive(false);
                shareLinkRepository.save(s);
            }
            logger.info("Deactivated {} expired share links", expired.size());
        } else {
            logger.info("No expired share links to deactivate");
        }
    }
}
