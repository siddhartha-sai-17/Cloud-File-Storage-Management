package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class AdminStatsDto {
    private long totalUsers;
    private long activeUsers; // Users who performed at least one action in the audit logs
    private long totalFiles;
    private long totalFolders;
    private long totalWorkspaces;
    private long totalStorageBytes;

    private long totalUploads;
    private long totalDownloads;
    private long totalOcrJobs;
    private long totalSearches;
    private long totalShares;
    private long totalVersions;
    private long totalNotifications;

    private Map<String, Long> storageByType; // Breakdown of size by category
    private Map<String, Long> activityOverTime; // Daily active audit log counts
}
