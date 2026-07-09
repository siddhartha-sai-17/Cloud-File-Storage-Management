package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareStatisticsDto {
    private UUID shareLinkId;
    private long totalViews;
    private long totalDownloads;
    private long totalPreviews;
    private long totalUploads;
    private long uniqueVisitors;
    private long uniqueIps;
    private double averageDownloadSize;
    private Map<String, Long> deviceStats;
    private Map<String, Long> browserStats;
    private Map<String, Long> countryStats;
    private List<AccessLogDto> recentActivity;
}
