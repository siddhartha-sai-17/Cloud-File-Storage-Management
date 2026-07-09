package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.UploadChunkDto;
import com.cloudstorage.backend.service.UploadChunkService;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/uploads/session")
@RequiredArgsConstructor
@Tag(name = "Upload Chunks", description = "API endpoints for uploading individual file chunk blocks")
public class UploadChunkController {

    private final UploadChunkService uploadChunkService;

    @PostMapping("/{sessionId}/chunk")
    @Operation(summary = "Upload Chunk", description = "Uploads a specific chunk of a file. Returns session upload progress metrics.")
    @ApiResponse(responseCode = "200", description = "Chunk uploaded successfully",
            content = @Content(schema = @Schema(implementation = UploadChunkDto.Response.class)))
    @ApiResponse(responseCode = "400", description = "Invalid chunk number, size mismatch, or checksum validation failed")
    @ApiResponse(responseCode = "403", description = "Access denied (session owned by another user)")
    @ApiResponse(responseCode = "404", description = "Upload session not found")
    @ApiResponse(responseCode = "409", description = "Conflict due to duplicate chunk with different metadata or session in finalization/terminal state")
    @ApiResponse(responseCode = "410", description = "Upload session has expired")
    public ResponseEntity<UploadChunkDto.Response> uploadChunk(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "UUID session identifier", required = true) @PathVariable String sessionId,
            @Parameter(description = "1-based index of the chunk", required = true) @RequestParam("chunkNumber") Integer chunkNumber,
            @Parameter(description = "Size of the chunk in bytes") @RequestParam(value = "size", required = false) Long size,
            @Parameter(description = "Client-calculated SHA-256 checksum of the chunk") @RequestParam(value = "checksum", required = false) String checksum,
            @Parameter(description = "Client-calculated SHA-256 checksum of the chunk via header") @RequestHeader(value = "X-Upload-Chunk-Checksum", required = false) String headerChecksum,
            @Parameter(description = "Chunk binary file data", required = true) @RequestParam("file") MultipartFile file) throws IOException {

        long finalSize = (size != null) ? size : file.getSize();
        String resolvedChecksum = (checksum != null && !checksum.trim().isEmpty()) ? checksum : headerChecksum;
        
        try (var inputStream = file.getInputStream()) {
            UploadChunkDto.Response response = uploadChunkService.uploadChunk(
                    userDetails.getUsername(),
                    sessionId,
                    chunkNumber,
                    finalSize,
                    resolvedChecksum,
                    inputStream
            );
            return ResponseEntity.ok(response);
        }
    }
}
