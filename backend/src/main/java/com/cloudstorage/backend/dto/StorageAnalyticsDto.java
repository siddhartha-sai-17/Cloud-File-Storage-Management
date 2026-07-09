package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class StorageAnalyticsDto {
    private Long workspaceId;
    private long storageUsed;
    private double growthPercentage; // Growth over the last 30 days

    private List<StorageDto.Item> largestFiles;
    private List<StorageDto.Item> mostDownloaded;
    private List<StorageDto.Item> mostViewed;
    private List<StorageDto.Item> mostShared;

    private Map<String, Long> storageByFileType;
    private Map<String, Long> storageByOwner;

    private Map<String, Long> dailyUploadGraph; // Last 30 days daily upload size in bytes
    private Map<String, Long> monthlyUploadGraph; // Last 12 months monthly upload size in bytes
    private Map<String, Long> activityHeatmap; // Key format "DayOfWeek:HourOfDay" -> count (e.g. "MONDAY:14" -> 25)
}
