package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.service.FavoritesService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Favorites Management", description = "Endpoints for starring, unstarring, and querying favorite files")
public class FavoritesController {

    private final FavoritesService favoritesService;

    @PostMapping("/{fileId}")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Star a file",
            description = "Mark a specific file as a favorite/starred item"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "File successfully starred"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "File not found")
    })
    public ResponseEntity<Void> starFile(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "ID of the file to star", required = true)
            @PathVariable Long fileId) {
        favoritesService.starFile(userDetails.getUsername(), fileId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{fileId}")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Unstar a file",
            description = "Remove the favorite/starred flag from a specific file"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "File successfully unstarred"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "File not found")
    })
    public ResponseEntity<Void> unstarFile(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "ID of the file to unstar", required = true)
            @PathVariable Long fileId) {
        favoritesService.unstarFile(userDetails.getUsername(), fileId);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(
            summary = "List favorite files",
            description = "Retrieve a paginated list of all files marked as favorites"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "List of favorites successfully retrieved")
    public ResponseEntity<Page<StorageDto.Item>> listFavorites(
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        return ResponseEntity.ok(favoritesService.listFavorites(userDetails.getUsername(), pageable));
    }

    @GetMapping("/stats")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get favorites statistics",
            description = "Retrieve summary metrics (counts, sizes, categories breakdown) of favorite files"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Favorite statistics successfully retrieved")
    public ResponseEntity<Map<String, Object>> getFavoriteStatistics(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(favoritesService.getFavoriteStatistics(userDetails.getUsername()));
    }
}
