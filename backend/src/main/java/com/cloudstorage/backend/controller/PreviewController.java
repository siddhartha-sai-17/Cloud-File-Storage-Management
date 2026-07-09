package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.PreviewDto;
import com.cloudstorage.backend.service.PreviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "File Preview", description = "Endpoints for generating text previews and file thumbnails")
public class PreviewController {

    private final PreviewService previewService;

    // 1x1 transparent PNG bytes
    private static final byte[] TRANSPARENT_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");

    @GetMapping("/{id}/preview")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get file preview",
            description = "Generate a preview metadata and excerpt context for a specific file (supported textual/document types)"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Preview successfully generated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "File not found")
    })
    public ResponseEntity<PreviewDto> getPreview(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "ID of the file to preview", required = true)
            @PathVariable Long id) {
        return ResponseEntity.ok(previewService.getPreview(userDetails.getUsername(), id));
    }

    @GetMapping(value = "/{id}/thumbnail", produces = MediaType.IMAGE_PNG_VALUE)
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get file thumbnail",
            description = "Generate or retrieve a visual thumbnail image (PNG bytes) for a specific file"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Thumbnail bytes successfully retrieved")
    public ResponseEntity<byte[]> getThumbnail(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "ID of the file", required = true)
            @PathVariable Long id) {
        // Fallback thumbnail generation
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(TRANSPARENT_PNG);
    }
}
