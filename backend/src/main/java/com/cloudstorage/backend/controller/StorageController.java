package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final StorageService storageService;

    @GetMapping
    public ResponseEntity<List<StorageDto.Item>> list(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) Long folderId) {
        return ResponseEntity.ok(storageService.listItems(userDetails.getUsername(), folderId));
    }

    @PostMapping("/folder")
    public ResponseEntity<Void> createFolder(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String name,
            @RequestParam(required = false) Long parentId) {
        storageService.createFolder(userDetails.getUsername(), name, parentId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/upload")
    public ResponseEntity<Void> uploadFile(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long folderId) {
        storageService.uploadFile(userDetails.getUsername(), file, folderId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<InputStreamResource> downloadFile(@AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        InputStreamResource resource = new InputStreamResource(
                storageService.downloadFile(userDetails.getUsername(), id));
        FileMetadata metadata = storageService.getFileMetadata(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .body(resource);
    }
}
