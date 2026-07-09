package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.ShareDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class LegacyShareController {

    private final ShareService shareService;

    @PostMapping("/api/share/{fileId}")
    public ResponseEntity<ShareDto> createShareLink(@AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId,
            @RequestParam(required = false) String password,
            @RequestParam(required = false) Integer expiryDays,
            @RequestParam(required = false) Integer downloadLimit) {
        System.out.println("DEBUG: createShareLink called by " + userDetails.getUsername() + " for file " + fileId);
        return ResponseEntity.ok(shareService.createShareLink(userDetails.getUsername(), fileId, password, expiryDays, downloadLimit));
    }

    @GetMapping("/api/share")
    public ResponseEntity<List<ShareDto>> listMyShares(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shareService.listMyShares(userDetails.getUsername()));
    }

    @DeleteMapping("/api/share/{id}")
    public ResponseEntity<Void> disableShare(@AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        shareService.disableShare(userDetails.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    // PUBLIC ENDPOINTS
    @GetMapping("/api/public/info/{token}")
    public ResponseEntity<java.util.Map<String, Object>> getPublicShareInfo(@PathVariable String token) {
        boolean passwordRequired = shareService.isPasswordRequired(token);
        java.util.Map<String, Object> info = new java.util.HashMap<>();
        info.put("passwordRequired", passwordRequired);
        
        try {
            FileMetadata metadata = shareService.getSharedFileMetadata(token, null);
            info.put("fileName", metadata.getFilename());
            info.put("size", metadata.getSize());
            info.put("contentType", metadata.getContentType());
        } catch (Exception e) {
            // If password is required, getSharedFileMetadata throws error. That's fine, we still return passwordRequired = true
            if (!passwordRequired) {
                return ResponseEntity.status(400).body(java.util.Map.of("error", e.getMessage()));
            }
        }
        return ResponseEntity.ok(info);
    }

    @GetMapping("/api/public/{token}")
    public ResponseEntity<InputStreamResource> downloadSharedFile(@PathVariable String token, @RequestParam(required = false) String password) {
        System.out.println("DEBUG: downloadSharedFile called for token " + token);
        FileMetadata metadata = shareService.getSharedFileMetadata(token, password);
        InputStreamResource resource = new InputStreamResource(shareService.getSharedFileStream(token, password));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .body(resource);
    }
}
