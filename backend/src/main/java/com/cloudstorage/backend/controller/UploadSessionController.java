package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.UploadSessionDto;
import com.cloudstorage.backend.service.UploadSessionService;
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

@RestController
@RequestMapping("/api/uploads/session")
@RequiredArgsConstructor
@Tag(name = "Upload Sessions", description = "API endpoints for enterprise chunked file upload session management")
public class UploadSessionController {

    private final UploadSessionService uploadSessionService;

    @PostMapping
    @Operation(summary = "Initialize Upload Session", description = "Creates or reuses an upload session for a file. Returns session properties.")
    @ApiResponse(responseCode = "200", description = "Upload session successfully initialized or reused",
            content = @Content(schema = @Schema(implementation = UploadSessionDto.Response.class)))
    @ApiResponse(responseCode = "400", description = "Invalid filename, zero-byte size, or out-of-bounds parameters")
    @ApiResponse(responseCode = "403", description = "Access denied to target directory path")
    public ResponseEntity<UploadSessionDto.Response> createSession(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UploadSessionDto.Request request) {
        return ResponseEntity.ok(uploadSessionService.createSession(userDetails.getUsername(), request));
    }

    @GetMapping("/{sessionId}")
    @Operation(summary = "Retrieve Upload Session", description = "Fetches the current progress and metadata of an active upload session by its ID.")
    @ApiResponse(responseCode = "200", description = "Upload session details retrieved successfully",
            content = @Content(schema = @Schema(implementation = UploadSessionDto.Response.class)))
    @ApiResponse(responseCode = "403", description = "Access denied (session owned by another user)")
    @ApiResponse(responseCode = "404", description = "Upload session not found")
    @ApiResponse(responseCode = "410", description = "Upload session has expired")
    public ResponseEntity<UploadSessionDto.Response> getSession(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "UUID session identifier", required = true) @PathVariable String sessionId) {
        return ResponseEntity.ok(uploadSessionService.getSession(userDetails.getUsername(), sessionId));
    }

    @DeleteMapping("/{sessionId}")
    @Operation(summary = "Cancel Upload Session", description = "Aborts an active upload session and marks its status as CANCELLED.")
    @ApiResponse(responseCode = "200", description = "Upload session successfully cancelled",
            content = @Content(schema = @Schema(implementation = UploadSessionDto.Response.class)))
    @ApiResponse(responseCode = "403", description = "Access denied (session owned by another user)")
    @ApiResponse(responseCode = "404", description = "Upload session not found")
    @ApiResponse(responseCode = "409", description = "Upload session already completed and cannot be cancelled")
    public ResponseEntity<UploadSessionDto.Response> cancelSession(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "UUID session identifier", required = true) @PathVariable String sessionId) {
        return ResponseEntity.ok(uploadSessionService.cancelSession(userDetails.getUsername(), sessionId));
    }
}
