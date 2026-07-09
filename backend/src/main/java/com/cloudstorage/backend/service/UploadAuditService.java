package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.UploadAuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface UploadAuditService {

    void logEvent(String sessionId, String username, String eventType, String resultStatus, String details, Long durationMs);

    void logEventWithContext(String sessionId, String username, String eventType, String resultStatus, String details, Long durationMs, String ip, String userAgent);

    Page<UploadAuditEvent> queryEvents(String sessionId, String username, String eventType, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
}
