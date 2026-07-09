package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrStatistics {
    private long pendingJobs;
    private long processingJobs;
    private long completedJobs;
    private long failedJobs;
    private long totalJobs;
    private double successRate;
}
