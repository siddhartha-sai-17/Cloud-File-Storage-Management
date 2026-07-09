package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.AuditEventDto;
import com.cloudstorage.backend.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/api/workspaces/{workspaceId}/audit")
    public ResponseEntity<Page<AuditEventDto>> getWorkspaceAuditLogs(
            @PathVariable Long workspaceId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        Page<AuditEventDto> logs = auditService.queryAudit(workspaceId, null, null, null, null, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/api/audit")
    public ResponseEntity<Page<AuditEventDto>> getGlobalAuditLogs(
            @RequestParam(required = false) Long workspaceId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) com.cloudstorage.backend.entity.AuditEventType eventType,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        Page<AuditEventDto> logs = auditService.queryAudit(workspaceId, username, eventType, null, null, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/api/audit/workspace/{id}")
    public ResponseEntity<Page<AuditEventDto>> getAuditLogsByWorkspace(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        Page<AuditEventDto> logs = auditService.queryAudit(id, null, null, null, null, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/api/audit/search")
    public ResponseEntity<Page<AuditEventDto>> searchAudit(
            @RequestParam String query,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        Page<AuditEventDto> logs = auditService.searchAudit(query, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/api/audit/statistics")
    public ResponseEntity<java.util.Map<String, Object>> getStatistics(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(auditService.statistics());
    }
}
