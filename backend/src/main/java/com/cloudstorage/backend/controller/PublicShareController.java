package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.SharePreviewDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.service.ShareService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.util.Map;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
public class PublicShareController {

    private final ShareService shareService;

    @GetMapping("/{token}")
    public ResponseEntity<SharePreviewDto> getSharePreview(@PathVariable String token) {
        return ResponseEntity.ok(shareService.getSharePreview(token));
    }

    @GetMapping("/{token}/download")
    public ResponseEntity<InputStreamResource> downloadFile(@PathVariable String token,
                                                             @RequestParam(required = false) String password,
                                                             @RequestParam(required = false) String expires,
                                                             @RequestParam(required = false) String signature,
                                                             HttpServletRequest request) {
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        // Validate signed URL first if signature params are present
        boolean isSigned = false;
        if (signature != null && expires != null) {
            if (shareService.validateSignedUrl(token, expires, signature)) {
                isSigned = true;
            } else {
                return ResponseEntity.status(403).build(); // Forbidden / Replay or tampered
            }
        }

        // If not a valid signed URL, validation logic checks password
        String passToUse = isSigned ? null : password;
        InputStream is = shareService.downloadSharedFile(token, passToUse, ip, ua, isSigned);
        FileMetadata metadata = shareService.getSharedFileMetadataByToken(token);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .body(new InputStreamResource(is));
    }

    @GetMapping("/{token}/preview")
    public ResponseEntity<InputStreamResource> previewFile(@PathVariable String token,
                                                            @RequestParam(required = false) String password,
                                                            @RequestParam(required = false) String expires,
                                                            @RequestParam(required = false) String signature,
                                                            HttpServletRequest request) {
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        // Validate signed URL first if signature params are present
        boolean isSigned = false;
        if (signature != null && expires != null) {
            if (shareService.validateSignedUrl(token, expires, signature)) {
                isSigned = true;
            } else {
                return ResponseEntity.status(403).build();
            }
        }

        String passToUse = isSigned ? null : password;
        InputStream is = shareService.previewSharedFile(token, passToUse, ip, ua, isSigned);
        FileMetadata metadata = shareService.getSharedFileMetadataByToken(token);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + metadata.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .body(new InputStreamResource(is));
    }

    @PostMapping("/{token}/authenticate")
    public ResponseEntity<Map<String, Object>> authenticatePassword(@PathVariable String token,
                                                                    @RequestBody Map<String, String> body) {
        String password = body.get("password");
        // Verify token exists and retrieve preview metadata
        SharePreviewDto preview = shareService.getSharePreview(token);
        shareService.verifySharePassword(preview.getShareLinkId(), password);

        // Generate a signed URL signature for the user so they can access without re-entering password
        String signedUrl = shareService.generateSignedUrl(preview.getShareLinkId(), 1800); // 30 minutes TTL

        return ResponseEntity.ok(Map.of(
                "success", true,
                "signedUrl", signedUrl,
                "expiresInSeconds", 1800
        ));
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
