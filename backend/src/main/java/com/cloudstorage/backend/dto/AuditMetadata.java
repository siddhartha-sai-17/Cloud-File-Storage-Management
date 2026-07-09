package com.cloudstorage.backend.dto;

import lombok.*;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditMetadata {
    private String requestId;
    private String correlationId;
    private String sessionId;
    private Long workspaceId;
    private String uploadSessionId;
    private Long fileId;
    private Long versionId;
    private String clientIp;
    private String userAgent;
    private Long executionDuration;
    private Map<String, Object> additionalProperties;
}
