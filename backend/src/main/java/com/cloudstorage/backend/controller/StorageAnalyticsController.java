package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.StorageAnalyticsDto;
import com.cloudstorage.backend.service.StorageAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class StorageAnalyticsController {

    private final StorageAnalyticsService storageAnalyticsService;

    @GetMapping("/{workspaceId}/analytics")
    public ResponseEntity<StorageAnalyticsDto> getWorkspaceAnalytics(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long workspaceId) {
        return ResponseEntity.ok(storageAnalyticsService.getWorkspaceAnalytics(userDetails.getUsername(), workspaceId));
    }
}
