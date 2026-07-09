package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class UploadPerformanceSummaryDto {
    private double systemAverageThroughputMbS;
    private double systemPeakThroughputMbS;
    private long totalChunksProcessed;
    private double systemAverageChunkProcessingTimeMs;
    private double systemAverageChecksumTimeMs;
    private long totalBytesUploaded;
    private long systemMemoryUsedBytes;
    private long systemMemoryMaxBytes;
    private int bufferPoolSize;
    private int bufferPoolActiveAllocations;
    private double executorUtilization;
    private List<UploadPerformanceSnapshot> sessionSnapshots;
}
