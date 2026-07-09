package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.UploadRetryResponseDto;
import com.cloudstorage.backend.service.UploadRetryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/uploads/session/{sessionId}")
@RequiredArgsConstructor
@Tag(name = "Upload Retry", description = "Upload Retry Engine Endpoints")
public class UploadRetryController {

    private final UploadRetryService uploadRetryService;

    @PostMapping("/chunk/{chunkNumber}/retry")
    @Operation(summary = "Manually trigger retry for a chunk", description = "Enqueues a manual retry for a failed chunk")
    @ApiResponse(responseCode = "200", description = "Retry scheduled successfully")
    @ApiResponse(responseCode = "400", description = "Retry not allowed (e.g. chunk already uploaded/completed)")
    @ApiResponse(responseCode = "409", description = "Retry limit exceeded or retry already in progress")
    public ResponseEntity<UploadRetryResponseDto> triggerRetry(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionId,
            @PathVariable Integer chunkNumber) {
        UploadRetryResponseDto response = uploadRetryService.manualRetry(userDetails.getUsername(), sessionId, chunkNumber);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/retries")
    @Operation(summary = "Get all pending retries for a session", description = "Returns a list of all chunks currently in RETRY_PENDING status")
    @ApiResponse(responseCode = "200", description = "List retrieved successfully")
    public ResponseEntity<List<UploadRetryResponseDto>> getPendingRetries(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionId) {
        List<UploadRetryResponseDto> retries = uploadRetryService.getPendingRetries(userDetails.getUsername(), sessionId);
        return ResponseEntity.ok(retries);
    }
}
