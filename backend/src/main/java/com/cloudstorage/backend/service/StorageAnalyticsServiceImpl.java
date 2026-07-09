package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageAnalyticsDto;
import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StorageAnalyticsServiceImpl implements StorageAnalyticsService {

    private final WorkspaceRepository workspaceRepository;
    private final FileRepository fileRepository;
    private final AuditRepository auditRepository;
    private final ShareLinkRepository shareLinkRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional(readOnly = true)
    public StorageAnalyticsDto getWorkspaceAnalytics(String username, Long workspaceId) {
        authorizationService.checkWorkspacePermission(username, workspaceId, "READ");

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        // Fetch all files in the workspace (not deleted)
        List<FileMetadata> files = fileRepository.findByWorkspaceAndFolderIsNullAndDeletedFalse(workspace);
        // Also fetch files inside folders
        List<FileMetadata> allWorkspaceFiles = fileRepository.findAll().stream()
                .filter(f -> f.getWorkspace() != null && f.getWorkspace().getId().equals(workspaceId) && !f.isDeleted())
                .collect(Collectors.toList());

        long storageUsed = allWorkspaceFiles.stream().mapToLong(FileMetadata::getSize).sum();

        // 1. Largest files
        List<StorageDto.Item> largestFiles = allWorkspaceFiles.stream()
                .sorted(Comparator.comparingLong(FileMetadata::getSize).reversed())
                .limit(5)
                .map(this::mapToDto)
                .collect(Collectors.toList());

        // 2. Fetch all audit events for this workspace
        List<AuditEvent> auditEvents = auditRepository.findAll().stream()
                .filter(a -> a.getWorkspaceId() != null && a.getWorkspaceId().equals(workspaceId))
                .collect(Collectors.toList());

        // Group downloads by file ID
        Map<Long, Long> downloadCounts = auditEvents.stream()
                .filter(a -> a.getEventType() == AuditEventType.FILE_DOWNLOADED || a.getEventType() == AuditEventType.SHARE_DOWNLOADED)
                .filter(a -> a.getEntityId() != null && a.getEntityType() == EntityType.FILE)
                .collect(Collectors.groupingBy(AuditEvent::getEntityId, Collectors.counting()));

        // Group views by file ID
        Map<Long, Long> viewCounts = auditEvents.stream()
                .filter(a -> a.getEventType() == AuditEventType.SHARE_VIEWED)
                .filter(a -> a.getEntityId() != null && a.getEntityType() == EntityType.FILE)
                .collect(Collectors.groupingBy(AuditEvent::getEntityId, Collectors.counting()));

        // Map files for fast lookup
        Map<Long, FileMetadata> fileMap = allWorkspaceFiles.stream()
                .collect(Collectors.toMap(FileMetadata::getId, f -> f));

        // 3. Most downloaded
        List<StorageDto.Item> mostDownloaded = downloadCounts.entrySet().stream()
                .filter(e -> fileMap.containsKey(e.getKey()))
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> mapToDto(fileMap.get(e.getKey())))
                .collect(Collectors.toList());

        // 4. Most viewed
        List<StorageDto.Item> mostViewed = viewCounts.entrySet().stream()
                .filter(e -> fileMap.containsKey(e.getKey()))
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> mapToDto(fileMap.get(e.getKey())))
                .collect(Collectors.toList());

        // 5. Most shared (Group share links by file ID)
        Map<Long, Long> shareCounts = shareLinkRepository.findAll().stream()
                .filter(s -> s.getWorkspace() != null && s.getWorkspace().getId().equals(workspaceId) && s.getFileMetadata() != null)
                .collect(Collectors.groupingBy(s -> s.getFileMetadata().getId(), Collectors.counting()));

        List<StorageDto.Item> mostShared = shareCounts.entrySet().stream()
                .filter(e -> fileMap.containsKey(e.getKey()))
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> mapToDto(fileMap.get(e.getKey())))
                .collect(Collectors.toList());

        // 6. Storage by file type (category)
        Map<String, Long> storageByFileType = allWorkspaceFiles.stream()
                .collect(Collectors.groupingBy(
                        f -> f.getCategory() != null ? f.getCategory() : "Other",
                        Collectors.summingLong(FileMetadata::getSize)
                ));

        // 7. Storage by owner
        Map<String, Long> storageByOwner = allWorkspaceFiles.stream()
                .collect(Collectors.groupingBy(
                        f -> f.getUser() != null ? f.getUser().getUsername() : "System",
                        Collectors.summingLong(FileMetadata::getSize)
                ));

        // 8. Daily upload graph (last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, Long> dailyUploadsRaw = allWorkspaceFiles.stream()
                .filter(f -> f.getUploadDate() != null && f.getUploadDate().isAfter(thirtyDaysAgo))
                .collect(Collectors.groupingBy(
                        f -> f.getUploadDate().format(dayFormatter),
                        Collectors.summingLong(FileMetadata::getSize)
                ));
        Map<String, Long> dailyUploadGraph = new TreeMap<>(dailyUploadsRaw);

        // 9. Monthly upload graph (last 12 months)
        LocalDateTime oneYearAgo = LocalDateTime.now().minusYears(1);
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");

        Map<String, Long> monthlyUploadsRaw = allWorkspaceFiles.stream()
                .filter(f -> f.getUploadDate() != null && f.getUploadDate().isAfter(oneYearAgo))
                .collect(Collectors.groupingBy(
                        f -> f.getUploadDate().format(monthFormatter),
                        Collectors.summingLong(FileMetadata::getSize)
                ));
        Map<String, Long> monthlyUploadGraph = new TreeMap<>(monthlyUploadsRaw);

        // 10. Growth trend calculation: compare storage uploaded in last 30 days with previous 30 days
        LocalDateTime sixtyDaysAgo = LocalDateTime.now().minusDays(60);
        long currentPeriodBytes = allWorkspaceFiles.stream()
                .filter(f -> f.getUploadDate() != null && f.getUploadDate().isAfter(thirtyDaysAgo))
                .mapToLong(FileMetadata::getSize)
                .sum();
        long previousPeriodBytes = allWorkspaceFiles.stream()
                .filter(f -> f.getUploadDate() != null && f.getUploadDate().isAfter(sixtyDaysAgo) && f.getUploadDate().isBefore(thirtyDaysAgo))
                .mapToLong(FileMetadata::getSize)
                .sum();

        double growthPercentage = 0.0;
        if (previousPeriodBytes > 0) {
            growthPercentage = ((double) (currentPeriodBytes - previousPeriodBytes) / previousPeriodBytes) * 100.0;
        }

        // 11. Heatmap data: DayOfWeek:HourOfDay -> count of activities
        Map<String, Long> activityHeatmap = new TreeMap<>();
        for (AuditEvent event : auditEvents) {
            if (event.getCreatedAt() != null) {
                String key = event.getCreatedAt().getDayOfWeek().name() + ":" + event.getCreatedAt().getHour();
                activityHeatmap.put(key, activityHeatmap.getOrDefault(key, 0L) + 1L);
            }
        }

        return StorageAnalyticsDto.builder()
                .workspaceId(workspaceId)
                .storageUsed(storageUsed)
                .growthPercentage(growthPercentage)
                .largestFiles(largestFiles)
                .mostDownloaded(mostDownloaded)
                .mostViewed(mostViewed)
                .mostShared(mostShared)
                .storageByFileType(storageByFileType)
                .storageByOwner(storageByOwner)
                .dailyUploadGraph(dailyUploadGraph)
                .monthlyUploadGraph(monthlyUploadGraph)
                .activityHeatmap(activityHeatmap)
                .build();
    }

    private StorageDto.Item mapToDto(FileMetadata file) {
        return StorageDto.Item.builder()
                .id(file.getId())
                .name(file.getFilename())
                .type("FILE")
                .size(file.getSize())
                .createdDate(file.getUploadDate())
                .starred(file.isStarred())
                .category(file.getCategory())
                .tags(file.getTags())
                .classification(file.getClassification())
                .confidenceScore(file.getConfidenceScore())
                .versionValue(file.getVersionValue())
                .build();
    }
}
