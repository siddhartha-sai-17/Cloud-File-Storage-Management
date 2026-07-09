package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadProgressDto {
    private String sessionId;
    private String filename;
    private Long fileSize;
    private Long uploadedBytes;
    private Long remainingBytes;
    private Integer uploadedChunks;
    private Integer remainingChunks;
    private Integer totalChunks;
    private Double uploadPercentage;
    private Long currentSpeedBps;
    private Long averageSpeedBps;
    private Long peakSpeedBps;
    private Long etaSeconds;
    private LocalDateTime lastActivityAt;
    private LocalDateTime lastChunkCompletedAt;
    private String status;
    private String retryState;
    private String queueState;
    private Integer parallelActiveChunks;
    private Long progressVersion;
}
