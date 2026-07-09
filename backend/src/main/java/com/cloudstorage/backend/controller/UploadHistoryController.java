package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.entity.UploadAuditEvent;
import com.cloudstorage.backend.entity.UploadSession;
import com.cloudstorage.backend.entity.UploadSessionStatus;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import com.cloudstorage.backend.service.UploadAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/uploads/history")
@RequiredArgsConstructor
@Tag(name = "Upload History & Audit", description = "API endpoints for querying paginated upload history and pipeline audit logs")
public class UploadHistoryController {

    private final UploadSessionRepository uploadSessionRepository;
    private final UploadAuditService uploadAuditService;
    private final com.cloudstorage.backend.service.UploadRetentionScheduler uploadRetentionScheduler;

    @GetMapping
    @Operation(summary = "Get Upload History", description = "Returns a paginated list of upload sessions for the authenticated user, optionally filtered by status, session ID, and date range.")
    public ResponseEntity<Page<UploadSession>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) UploadSessionStatus status,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        
        Pageable pageable = parsePageable(page, size, sort);
        Page<UploadSession> result = uploadSessionRepository.filterSessions(
                userDetails.getUsername(),
                status,
                sessionId,
                startDate,
                endDate,
                pageable
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/audit")
    @Operation(summary = "Get Audit Logs", description = "Returns a paginated list of audit events for the authenticated user's upload sessions, filtered by session ID, event type, and date range.")
    public ResponseEntity<Page<UploadAuditEvent>> getAuditLogs(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp,desc") String sort) {

        Pageable pageable = parsePageable(page, size, sort);
        Page<UploadAuditEvent> result = uploadAuditService.queryEvents(
                sessionId,
                userDetails.getUsername(),
                eventType,
                startDate,
                endDate,
                pageable
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/cleanup")
    @Operation(summary = "Trigger Retention Cleanup", description = "Manually triggers the history and audit log retention cleanup process.")
    public ResponseEntity<Void> triggerCleanup() {
        uploadRetentionScheduler.runCleanup();
        return ResponseEntity.ok().build();
    }

    private Pageable parsePageable(int page, int size, String sort) {
        String[] sortParams = sort.split(",");
        String property = sortParams[0];
        Sort.Direction direction = Sort.Direction.DESC;
        if (sortParams.length > 1 && "asc".equalsIgnoreCase(sortParams[1])) {
            direction = Sort.Direction.ASC;
        }
        return PageRequest.of(page, size, Sort.by(direction, property));
    }
}
