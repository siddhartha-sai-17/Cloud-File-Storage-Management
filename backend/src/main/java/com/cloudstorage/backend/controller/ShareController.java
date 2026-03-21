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
public class ShareController {

    private final ShareService shareService;

    @PostMapping("/api/share/{fileId}")
    public ResponseEntity<ShareDto> createShareLink(@AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        System.out.println("DEBUG: createShareLink called by " + userDetails.getUsername() + " for file " + fileId);
        return ResponseEntity.ok(shareService.createShareLink(userDetails.getUsername(), fileId));
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

    // PUBLIC ENDPOINT
    @GetMapping("/api/public/{token}")
    public ResponseEntity<InputStreamResource> downloadSharedFile(@PathVariable String token) {
        System.out.println("DEBUG: downloadSharedFile called for token " + token);
        InputStreamResource resource = new InputStreamResource(shareService.getSharedFileStream(token));
        FileMetadata metadata = shareService.getSharedFileMetadata(token);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .body(resource);
    }
}
