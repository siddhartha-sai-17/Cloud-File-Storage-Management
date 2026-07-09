package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.FileVersionDto;
import com.cloudstorage.backend.entity.FileVersion;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.service.FileVersionService;
import com.cloudstorage.backend.repository.FileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.util.concurrent.locks.ReentrantLock;

@RestController
@RequestMapping("/api/files/{fileId}/versions")
@RequiredArgsConstructor
public class FileVersionController {

    private final FileVersionService fileVersionService;
    private final FileRepository fileRepository;

    private FileVersionDto.Response mapToDto(FileVersion version) {
        return FileVersionDto.Response.builder()
                .id(version.getId())
                .fileId(version.getFileMetadata().getId())
                .versionNumber(version.getVersionNumber())
                .versionValue(version.getVersionValue())
                .storagePath(version.getStoragePath())
                .sha256(version.getSha256())
                .size(version.getSize())
                .uploadedAt(version.getUploadedAt())
                .uploadedBy(version.getUploadedBy())
                .contentType(version.getContentType())
                .category(version.getCategory())
                .confidence(version.getConfidence())
                .tags(version.getTags())
                .changeDescription(version.getChangeDescription())
                .restoredFromVersion(version.getRestoredFromVersion())
                .currentVersion(version.isCurrentVersion())
                .build();
    }

    @GetMapping
    public ResponseEntity<Page<FileVersionDto.Response>> getVersions(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "versionNumber") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String uploadedBy,
            @RequestParam(required = false) String contentType) {

        Page<FileVersion> history = fileVersionService.getVersionHistory(
                userDetails.getUsername(), fileId, page, size, sortBy, direction, uploadedBy, contentType);
        return ResponseEntity.ok(history.map(this::mapToDto));
    }

    @GetMapping("/current")
    public ResponseEntity<FileVersionDto.Response> getCurrentVersion(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {

        FileVersion version = fileVersionService.getCurrentVersion(userDetails.getUsername(), fileId);
        return ResponseEntity.ok(mapToDto(version));
    }

    @GetMapping("/{versionId:\\d+}")
    public ResponseEntity<FileVersionDto.Response> getVersion(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId,
            @PathVariable Long versionId) {

        FileVersion version = fileVersionService.getVersionMetadata(userDetails.getUsername(), fileId, versionId);
        return ResponseEntity.ok(mapToDto(version));
    }

    @PostMapping("/{versionId:\\d+}/restore")
    public ResponseEntity<FileVersionDto.Response> restoreVersion(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId,
            @PathVariable Long versionId) {

        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        ReentrantLock lock = fileVersionService.getFileLock(
                userDetails.getUsername(),
                file.getFolder() != null ? file.getFolder().getId() : null,
                file.getFilename()
        );
        lock.lock();
        try {
            FileVersion version = fileVersionService.restoreVersion(userDetails.getUsername(), fileId, versionId);
            return ResponseEntity.ok(mapToDto(version));
        } finally {
            lock.unlock();
        }
    }

    @DeleteMapping("/{versionId:\\d+}")
    public ResponseEntity<Void> deleteVersion(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId,
            @PathVariable Long versionId) {

        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        ReentrantLock lock = fileVersionService.getFileLock(
                userDetails.getUsername(),
                file.getFolder() != null ? file.getFolder().getId() : null,
                file.getFilename()
        );
        lock.lock();
        try {
            fileVersionService.deleteVersion(userDetails.getUsername(), fileId, versionId);
            return ResponseEntity.noContent().build();
        } finally {
            lock.unlock();
        }
    }

    @GetMapping("/{versionId:\\d+}/download")
    public ResponseEntity<InputStreamResource> downloadVersion(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId,
            @PathVariable Long versionId) {

        InputStream is = fileVersionService.downloadVersion(userDetails.getUsername(), fileId, versionId);
        FileVersion version = fileVersionService.getVersionMetadata(userDetails.getUsername(), fileId, versionId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + version.getFileMetadata().getFilename() + "\"")
                .contentType(MediaType.parseMediaType(version.getContentType()))
                .body(new InputStreamResource(is));
    }
}
