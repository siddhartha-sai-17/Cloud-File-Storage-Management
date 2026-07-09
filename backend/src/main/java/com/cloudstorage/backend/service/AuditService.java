package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AuditEventDto;
import com.cloudstorage.backend.dto.AuditMetadata;
import com.cloudstorage.backend.entity.AuditEventType;
import com.cloudstorage.backend.entity.EntityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Map;

public interface AuditService {

    void logEvent(Long workspaceId, Long userId, String username, AuditEventType eventType,
                  EntityType entityType, Long entityId, String description,
                  String status, AuditMetadata metadata);

    Page<AuditEventDto> queryAudit(Long workspaceId, String username, AuditEventType eventType,
                                   LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    Page<AuditEventDto> searchAudit(String keyword, Pageable pageable);

    void cleanup(int retentionDays);

    Map<String, Object> statistics();
}
