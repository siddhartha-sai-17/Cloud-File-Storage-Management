package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.service.RecentFilesService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recent")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Recent Items", description = "Endpoints for retrieving recently uploaded, opened, or modified files")
public class RecentFilesController {

    private final RecentFilesService recentFilesService;

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get recent files",
            description = "Retrieve a paginated list of files recently interacted with (uploaded, opened, modified, or all)"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Recent files successfully retrieved")
    public ResponseEntity<Page<StorageDto.Item>> getRecentFiles(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "Filter type: UPLOADED, OPENED, MODIFIED, or ALL")
            @RequestParam(defaultValue = "ALL") String type,
            Pageable pageable) {
        return ResponseEntity.ok(recentFilesService.getRecentFiles(userDetails.getUsername(), type, pageable));
    }
}
