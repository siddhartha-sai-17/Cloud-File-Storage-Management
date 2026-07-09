package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.UploadIntegrityReportDto;
import com.cloudstorage.backend.service.UploadIntegrityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/uploads/session/{sessionId}")
@RequiredArgsConstructor
@Tag(name = "Upload Integrity", description = "Upload Integrity Verification Endpoints")
public class UploadIntegrityController {

    private final UploadIntegrityService uploadIntegrityService;

    @PostMapping("/verify")
    @Operation(summary = "Verify Upload Session Integrity", description = "Validates the integrity of all chunks uploaded for this session")
    @ApiResponse(responseCode = "200", description = "Integrity check executed successfully")
    @ApiResponse(responseCode = "403", description = "Unauthorized completion access")
    @ApiResponse(responseCode = "404", description = "Session not found")
    public ResponseEntity<UploadIntegrityReportDto> verifySession(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionId,
            @RequestParam(required = false) String checksum) {
        UploadIntegrityReportDto report = uploadIntegrityService.verifySession(userDetails.getUsername(), sessionId, checksum);
        return ResponseEntity.ok(report);
    }

    @PostMapping("/chunk/{chunkNumber}/verify")
    @Operation(summary = "Verify Individual Chunk Integrity", description = "Validates a single chunk physical file against database metadata")
    @ApiResponse(responseCode = "200", description = "Chunk verified successfully")
    @ApiResponse(responseCode = "409", description = "Chunk is corrupted or size/checksum mismatch")
    @ApiResponse(responseCode = "403", description = "Unauthorized access")
    @ApiResponse(responseCode = "404", description = "Session or chunk not found")
    public ResponseEntity<UploadIntegrityReportDto.ChunkVerificationDetail> verifyChunk(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionId,
            @PathVariable Integer chunkNumber,
            @RequestParam(required = false) String checksum) {
        UploadIntegrityReportDto.ChunkVerificationDetail detail = uploadIntegrityService.verifyChunk(
                userDetails.getUsername(), sessionId, chunkNumber, checksum);
        return ResponseEntity.ok(detail);
    }
}
