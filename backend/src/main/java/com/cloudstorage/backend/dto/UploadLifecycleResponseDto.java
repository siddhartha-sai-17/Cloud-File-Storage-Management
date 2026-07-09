package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class UploadLifecycleResponseDto {
    private String sessionId;
    private String status;
    private Integer uploadedChunks;
    private Long uploadedBytes;
    private Integer remainingChunks;
    private Double uploadPercentage;
    private LocalDateTime pausedAt;
    private LocalDateTime resumedAt;
    private LocalDateTime lastActivityAt;
    private Integer retryPendingCount;
}
