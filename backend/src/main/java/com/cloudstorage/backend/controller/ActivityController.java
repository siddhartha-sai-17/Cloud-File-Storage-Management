package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.ActivityTimelineDto;
import com.cloudstorage.backend.service.ActivityTimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityTimelineService activityTimelineService;

    @GetMapping({"/workspace/{workspaceId}", "/api/workspaces/{workspaceId}/activity"})
    public ResponseEntity<Page<ActivityTimelineDto>> getWorkspaceActivity(
            @PathVariable Long workspaceId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {

        Page<ActivityTimelineDto> activities = activityTimelineService.getWorkspaceActivity(workspaceId, pageable);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<ActivityTimelineDto>> getUserActivity(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {

        Page<ActivityTimelineDto> activities = activityTimelineService.getUserActivity(userId, pageable);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/file/{fileId}")
    public ResponseEntity<Page<ActivityTimelineDto>> getFileActivity(
            @PathVariable Long fileId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {

        Page<ActivityTimelineDto> activities = activityTimelineService.getFileActivity(fileId, pageable);
        return ResponseEntity.ok(activities);
    }
}
