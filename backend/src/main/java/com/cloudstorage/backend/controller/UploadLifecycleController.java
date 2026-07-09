package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.UploadLifecycleResponseDto;
import com.cloudstorage.backend.service.UploadLifecycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.cloudstorage.backend.service.ParallelUploadCoordinator;

@RestController
@RequestMapping("/api/uploads/session")
@RequiredArgsConstructor
@Tag(name = "Upload Lifecycle", description = "API endpoints for enterprise upload session pause, resume, and lifecycle tracking")
public class UploadLifecycleController {

    private final UploadLifecycleService uploadLifecycleService;
    private final ParallelUploadCoordinator parallelUploadCoordinator;

    @PostMapping("/{sessionId}/pause")
    @Operation(summary = "Pause Upload Session", description = "Pauses an active upload session, cancelling all scheduled retries and blocking new chunk uploads.")
    @ApiResponse(responseCode = "200", description = "Upload session successfully paused",
            content = @Content(schema = @Schema(implementation = UploadLifecycleResponseDto.class)))
    @ApiResponse(responseCode = "403", description = "Access denied (session owned by another user)")
    @ApiResponse(responseCode = "404", description = "Upload session not found")
    @ApiResponse(responseCode = "409", description = "Session already paused or not in active uploading state")
    public ResponseEntity<UploadLifecycleResponseDto> pauseUpload(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "UUID session identifier", required = true) @PathVariable String sessionId) {
        return ResponseEntity.ok(uploadLifecycleService.pauseUpload(userDetails.getUsername(), sessionId));
    }

    @PostMapping("/{sessionId}/resume")
    @Operation(summary = "Resume Upload Session", description = "Resumes a paused upload session, recovering pending retries and permitting chunk uploads.")
    @ApiResponse(responseCode = "200", description = "Upload session successfully resumed",
            content = @Content(schema = @Schema(implementation = UploadLifecycleResponseDto.class)))
    @ApiResponse(responseCode = "403", description = "Access denied (session owned by another user)")
    @ApiResponse(responseCode = "404", description = "Upload session not found")
    @ApiResponse(responseCode = "409", description = "Session is already active or cannot be transitioned from current state")
    public ResponseEntity<UploadLifecycleResponseDto> resumeUpload(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "UUID session identifier", required = true) @PathVariable String sessionId) {
        return ResponseEntity.ok(uploadLifecycleService.resumeUpload(userDetails.getUsername(), sessionId));
    }

    @GetMapping("/{sessionId}/status")
    @Operation(summary = "Get Upload Session Status", description = "Retrieves the detailed progress and lifecycle status DTO of an upload session.")
    @ApiResponse(responseCode = "200", description = "Upload session status retrieved successfully",
            content = @Content(schema = @Schema(implementation = UploadLifecycleResponseDto.class)))
    @ApiResponse(responseCode = "403", description = "Access denied (session owned by another user)")
    @ApiResponse(responseCode = "404", description = "Upload session not found")
    public ResponseEntity<UploadLifecycleResponseDto> getSessionStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "UUID session identifier", required = true) @PathVariable String sessionId) {
        return ResponseEntity.ok(uploadLifecycleService.getSessionStatus(userDetails.getUsername(), sessionId));
    }

    @GetMapping("/parallel/stats")
    @Operation(summary = "Get Parallel Upload Coordinator Stats", description = "Exposes active thread pool stats, queue depth, and active workers utilization.")
    @ApiResponse(responseCode = "200", description = "Stats retrieved successfully")
    public ResponseEntity<java.util.Map<String, Object>> getParallelStats() {
        return ResponseEntity.ok(parallelUploadCoordinator.getStats());
    }
}
