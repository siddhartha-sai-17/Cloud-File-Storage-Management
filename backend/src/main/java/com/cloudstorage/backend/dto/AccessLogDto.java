package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessLogDto {
    private Long id;
    private UUID shareLinkId;
    private String username;
    private String ipAddress;
    private String userAgent;
    private String operation;
    private LocalDateTime timestamp;
    private String status;
    private Long processingTimeMs;
}
