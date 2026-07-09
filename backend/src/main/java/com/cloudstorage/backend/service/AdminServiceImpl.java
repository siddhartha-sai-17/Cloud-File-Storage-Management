package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AdminStatsDto;
import com.cloudstorage.backend.entity.AuditEvent;
import com.cloudstorage.backend.entity.AuditEventType;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final WorkspaceRepository workspaceRepository;
    private final AuditRepository auditRepository;
    private final ShareLinkRepository shareLinkRepository;
    private final FileVersionRepository fileVersionRepository;
    private final NotificationRepository notificationRepository;
    private final OcrContentRepository ocrContentRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminStatsDto getGlobalStats(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found"));
        if (!user.isSysAdmin()) {
            throw new PermissionDeniedException("Sysadmin privileges required");
        }

        // Count basic entities
        long totalUsers = userRepository.count();
        long totalFiles = fileRepository.count();
        long totalFolders = folderRepository.count();
        long totalWorkspaces = workspaceRepository.count();
        long totalShares = shareLinkRepository.count();
        long totalVersions = fileVersionRepository.count();
        long totalNotifications = notificationRepository.count();

        // Calculate total storage
        long totalStorageBytes = fileRepository.findAll().stream()
                .filter(f -> !f.isDeleted())
                .mapToLong(FileMetadata::getSize)
                .sum();

        // Active users: unique usernames from audit log in last 30 days
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long activeUsers = auditRepository.findAll().stream()
                .filter(a -> a.getCreatedAt() != null && a.getCreatedAt().isAfter(thirtyDaysAgo))
                .map(AuditEvent::getUsername)
                .distinct()
                .count();

        // Count events in audit logs by event type
        long totalUploads = auditRepository.findAll().stream()
                .filter(a -> a.getEventType() == AuditEventType.UPLOAD_COMPLETED)
                .count();
        long totalDownloads = auditRepository.findAll().stream()
                .filter(a -> a.getEventType() == AuditEventType.FILE_DOWNLOADED || a.getEventType() == AuditEventType.SHARE_DOWNLOADED)
                .count();
        long totalOcrJobs = ocrContentRepository.count();
        long totalSearches = auditRepository.findAll().stream()
                .filter(a -> a.getEventType() == AuditEventType.SEARCH_EXECUTED)
                .count();

        // Breakdown of size by category
        Map<String, Long> storageByType = fileRepository.findAll().stream()
                .filter(f -> !f.isDeleted())
                .collect(Collectors.groupingBy(
                        f -> f.getCategory() != null ? f.getCategory() : "Other",
                        Collectors.summingLong(FileMetadata::getSize)
                ));

        // Activity over time: count daily audit log events for last 14 days
        LocalDateTime fourteenDaysAgo = LocalDateTime.now().minusDays(14);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, Long> activityOverTimeRaw = auditRepository.findAll().stream()
                .filter(a -> a.getCreatedAt() != null && a.getCreatedAt().isAfter(fourteenDaysAgo))
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().format(formatter),
                        Collectors.counting()
                ));

        // Use a TreeMap to keep the keys sorted chronologically
        Map<String, Long> activityOverTime = new TreeMap<>(activityOverTimeRaw);

        return AdminStatsDto.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .totalFiles(totalFiles)
                .totalFolders(totalFolders)
                .totalWorkspaces(totalWorkspaces)
                .totalStorageBytes(totalStorageBytes)
                .totalUploads(totalUploads)
                .totalDownloads(totalDownloads)
                .totalOcrJobs(totalOcrJobs)
                .totalSearches(totalSearches)
                .totalShares(totalShares)
                .totalVersions(totalVersions)
                .totalNotifications(totalNotifications)
                .storageByType(storageByType)
                .activityOverTime(activityOverTime)
                .build();
    }
}
