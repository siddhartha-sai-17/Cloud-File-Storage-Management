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
public class UploadRetryResponseDto {
    private String sessionId;
    private int chunkNumber;
    private int retryCount;
    private String status;
    private LocalDateTime nextRetryAt;
    private long estimatedDelay;
    private String message;
}
