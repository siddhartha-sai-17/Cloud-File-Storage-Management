package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.UploadAuditEvent;
import com.cloudstorage.backend.repository.UploadAuditRepository;
import com.cloudstorage.backend.security.AuditRequestContext;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UploadAuditServiceImpl implements UploadAuditService {

    private static final Logger logger = LoggerFactory.getLogger(UploadAuditServiceImpl.class);

    private final UploadAuditRepository uploadAuditRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String sessionId, String username, String eventType, String resultStatus, String details, Long durationMs) {
        String ip = AuditRequestContext.getClientIp();
        String ua = AuditRequestContext.getUserAgent();
        logEventWithContext(sessionId, username, eventType, resultStatus, details, durationMs, ip, ua);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEventWithContext(String sessionId, String username, String eventType, String resultStatus, String details, Long durationMs, String ip, String userAgent) {
        try {
            UploadAuditEvent event = UploadAuditEvent.builder()
                    .sessionId(sessionId != null ? sessionId : "N/A")
                    .username(username)
                    .eventType(eventType)
                    .resultStatus(resultStatus)
                    .details(details)
                    .processingDurationMs(durationMs)
                    .clientIp(ip)
                    .userAgent(userAgent)
                    .workspaceId(WorkspaceContextHolder.getCurrentWorkspaceId())
                    .build();
            uploadAuditRepository.save(event);
        } catch (Exception e) {
            // Audit failures must never rollback business logic
            logger.error("Failed to persist audit event for session: {}, eventType: {}, error: {}", sessionId, eventType, e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UploadAuditEvent> queryEvents(String sessionId, String username, String eventType, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        return uploadAuditRepository.filterEvents(sessionId, username, eventType, startDate, endDate, pageable);
    }
}
