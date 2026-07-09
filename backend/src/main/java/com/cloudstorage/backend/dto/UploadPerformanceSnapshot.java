package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UploadPerformanceSnapshot {
    private String sessionId;
    private double uploadThroughputMbS;
    private double averageThroughputMbS;
    private double peakThroughputMbS;
    private double averageChunkProcessingTimeMs;
    private double averageChecksumTimeMs;
    private long mergeDurationMs;
    private long objectStorageUploadDurationMs;
    private long databaseCommitDurationMs;
    private long retryOverheadMs;
    private long memoryUsedBytes;
    private long memoryMaxBytes;
    private int bufferPoolSize;
    private int bufferPoolActiveAllocations;
    private double executorUtilization;
}
