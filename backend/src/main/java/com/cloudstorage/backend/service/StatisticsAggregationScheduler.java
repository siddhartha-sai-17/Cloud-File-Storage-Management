package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.StatisticsSnapshot;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.ShareLinkRepository;
import com.cloudstorage.backend.repository.StatisticsSnapshotRepository;
import com.cloudstorage.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class StatisticsAggregationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(StatisticsAggregationScheduler.class);

    private final UserRepository userRepository;
    private final FileRepository fileRepository;
    private final ShareLinkRepository shareLinkRepository;
    private final StatisticsSnapshotRepository statisticsSnapshotRepository;

    @Scheduled(cron = "0 0 3 * * ?") // 3:00 AM nightly
    @Transactional
    public void aggregateDailyStats() {
        logger.info("Starting nightly statistics aggregation...");
        LocalDate today = LocalDate.now();

        // 1. Total users
        long usersCount = userRepository.count();
        statisticsSnapshotRepository.save(StatisticsSnapshot.builder()
                .snapshotDate(today)
                .metricName("TOTAL_USERS")
                .metricValue(usersCount)
                .build());

        // 2. Total files
        long filesCount = fileRepository.count();
        statisticsSnapshotRepository.save(StatisticsSnapshot.builder()
                .snapshotDate(today)
                .metricName("TOTAL_FILES")
                .metricValue(filesCount)
                .build());

        // 3. Total storage
        long totalStorage = fileRepository.findAll().stream()
                .filter(f -> !f.isDeleted())
                .mapToLong(FileMetadata::getSize)
                .sum();
        statisticsSnapshotRepository.save(StatisticsSnapshot.builder()
                .snapshotDate(today)
                .metricName("TOTAL_STORAGE_BYTES")
                .metricValue(totalStorage)
                .build());

        // 4. Total shares
        long sharesCount = shareLinkRepository.count();
        statisticsSnapshotRepository.save(StatisticsSnapshot.builder()
                .snapshotDate(today)
                .metricName("TOTAL_SHARES")
                .metricValue(sharesCount)
                .build());

        logger.info("Nightly statistics aggregation completed successfully.");
    }
}
