package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.AuditEventType;
import com.cloudstorage.backend.entity.EntityType;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEventDto {
    private Long id;
    private Long workspaceId;
    private Long userId;
    private String username;
    private AuditEventType eventType;
    private EntityType entityType;
    private Long entityId;
    private String description;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createdAt;
    private Long processingTimeMs;
    private String status;
    private String metadataJson;
}
