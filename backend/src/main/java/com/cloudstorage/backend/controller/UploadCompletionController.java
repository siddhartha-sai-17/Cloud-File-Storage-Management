package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.service.UploadCompletionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/uploads/session")
@RequiredArgsConstructor
@Tag(name = "Upload Completion", description = "API endpoints for finalization and completion of chunked file uploads")
public class UploadCompletionController {

    private final UploadCompletionService uploadCompletionService;

    @Data
    public static class CompleteRequest {
        @Schema(description = "Optional client-calculated SHA-256 checksum of the entire file", example = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        private String checksum;
    }

    @PostMapping("/{sessionId}/complete")
    @Operation(summary = "Complete Upload Session", description = "Finalizes the session, merges all chunks, uploads to permanent storage, validates checksum, and creates file metadata.")
    @ApiResponse(responseCode = "200", description = "Upload session completed successfully",
            content = @Content(schema = @Schema(implementation = UploadCompletionService.CompleteResponse.class)))
    @ApiResponse(responseCode = "400", description = "Incomplete upload session, size mismatch, or checksum validation failed")
    @ApiResponse(responseCode = "403", description = "Access denied (session owned by another user)")
    @ApiResponse(responseCode = "404", description = "Upload session not found")
    @ApiResponse(responseCode = "409", description = "Conflict due to duplicate completion or concurrent state conflict")
    @ApiResponse(responseCode = "410", description = "Upload session has expired")
    public ResponseEntity<UploadCompletionService.CompleteResponse> completeUpload(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "UUID session identifier", required = true) @PathVariable String sessionId,
            @RequestBody(required = false) CompleteRequest request) {

        String clientChecksum = (request != null) ? request.getChecksum() : null;
        UploadCompletionService.CompleteResponse response = uploadCompletionService.completeUpload(
                userDetails.getUsername(),
                sessionId,
                clientChecksum
        );
        return ResponseEntity.ok(response);
    }
}
