package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.*;
import com.cloudstorage.backend.service.ShareAnalyticsService;
import com.cloudstorage.backend.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/shares")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;
    private final ShareAnalyticsService analyticsService;

    @PostMapping
    public ResponseEntity<ShareLinkDto> createShare(@AuthenticationPrincipal UserDetails userDetails,
                                                    @RequestBody CreateShareRequest request) {
        return ResponseEntity.ok(shareService.createShare(userDetails.getUsername(), request));
    }

    @GetMapping
    public ResponseEntity<Page<ShareLinkDto>> getMyShares(@AuthenticationPrincipal UserDetails userDetails,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "20") int size,
                                                          @RequestParam(defaultValue = "createdAt") String sortBy,
                                                          @RequestParam(defaultValue = "DESC") String direction) {
        Sort sort = Sort.by(Sort.Direction.fromString(direction.toUpperCase()), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(shareService.getMyShares(userDetails.getUsername(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShareLinkDto> getShare(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable UUID id) {
        return ResponseEntity.ok(shareService.getShare(userDetails.getUsername(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShareLinkDto> updateShare(@AuthenticationPrincipal UserDetails userDetails,
                                                    @PathVariable UUID id,
                                                    @RequestBody UpdateShareRequest request) {
        return ResponseEntity.ok(shareService.updateShare(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShare(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID id) {
        shareService.deleteShare(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<Void> revokeShare(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID id) {
        shareService.revokeShare(userDetails.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/password")
    public ResponseEntity<Void> verifyPassword(@PathVariable UUID id,
                                               @RequestBody Map<String, String> body) {
        String password = body.get("password");
        shareService.verifySharePassword(id, password);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/statistics")
    public ResponseEntity<ShareStatisticsDto> getStatistics(@AuthenticationPrincipal UserDetails userDetails,
                                                             @PathVariable UUID id) {
        // Validation: verify current user owns the share link
        shareService.getShare(userDetails.getUsername(), id);
        return ResponseEntity.ok(analyticsService.getStatistics(id));
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<byte[]> getQrCode(@PathVariable UUID id,
                                            @RequestParam(defaultValue = "PNG") String format,
                                            @RequestParam(defaultValue = "250") int width,
                                            @RequestParam(defaultValue = "250") int height) {
        byte[] qrBytes = shareService.generateQrCode(id, format, width, height);
        MediaType mediaType = "SVG".equalsIgnoreCase(format) ? MediaType.valueOf("image/svg+xml") : MediaType.IMAGE_PNG;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(qrBytes);
    }

    @PostMapping("/{id}/sign")
    public ResponseEntity<Map<String, String>> signUrl(@AuthenticationPrincipal UserDetails userDetails,
                                                        @PathVariable UUID id,
                                                        @RequestParam(defaultValue = "3600") long ttlSeconds) {
        // Validation: verify current user owns the share link
        shareService.getShare(userDetails.getUsername(), id);
        String signedUrl = shareService.generateSignedUrl(id, ttlSeconds);
        return ResponseEntity.ok(Map.of("signedUrl", signedUrl));
    }
}
