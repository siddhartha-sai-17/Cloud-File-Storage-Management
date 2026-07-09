package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.DuplicateGroupDto;
import com.cloudstorage.backend.service.DuplicateDetectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/duplicates")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Deduplication & Storage Intelligence", description = "Endpoints for identifying duplicate files and potential storage space savings")
public class DuplicateDetectionController {

    private final DuplicateDetectionService duplicateDetectionService;

    @GetMapping("/report")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get duplicate files report",
            description = "Retrieve groups of duplicate files clustered by their SHA-256 content checksums"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Duplicate report successfully generated")
    public ResponseEntity<List<DuplicateGroupDto>> getDuplicateReport(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(duplicateDetectionService.getDuplicateReport(userDetails.getUsername()));
    }

    @GetMapping("/stats")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get potential deduplication storage savings",
            description = "Retrieve statistical summary of space savings and total redundant files"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Deduplication statistics successfully retrieved")
    public ResponseEntity<Map<String, Object>> getStorageSavingStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(duplicateDetectionService.getStorageSavingStats(userDetails.getUsername()));
    }
}
