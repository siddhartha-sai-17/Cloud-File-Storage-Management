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

    @GetMapping("/starred")
    public ResponseEntity<List<StorageDto.Item>> listStarred(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(storageService.listStarredItems(userDetails.getUsername()));
    }

    @GetMapping("/trash")
    public ResponseEntity<List<StorageDto.Item>> listTrash(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(storageService.listTrashItems(userDetails.getUsername()));
    }

    @PostMapping("/star/{id}")
    public ResponseEntity<Void> toggleStar(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long id) {
        storageService.toggleStar(userDetails.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/rename")
    public ResponseEntity<Void> rename(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam boolean isFolder,
            @RequestParam String newName) {
        storageService.rename(userDetails.getUsername(), id, isFolder, newName);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/delete")
    public ResponseEntity<Void> softDelete(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam boolean isFolder) {
        storageService.softDelete(userDetails.getUsername(), id, isFolder);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/restore")
    public ResponseEntity<Void> restore(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam boolean isFolder) {
        storageService.restore(userDetails.getUsername(), id, isFolder);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/permanent")
    public ResponseEntity<Void> permanentDelete(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam boolean isFolder) {
        storageService.permanentDelete(userDetails.getUsername(), id, isFolder);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/copy")
    public ResponseEntity<Void> copy(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam boolean isFolder,
            @RequestParam(required = false) Long targetFolderId) {
        storageService.copy(userDetails.getUsername(), id, isFolder, targetFolderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/move")
    public ResponseEntity<Void> move(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam boolean isFolder,
            @RequestParam(required = false) Long targetFolderId) {
        storageService.move(userDetails.getUsername(), id, isFolder, targetFolderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tags")
    public ResponseEntity<Void> updateTags(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam String tags) {
        storageService.updateTags(userDetails.getUsername(), id, tags);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/category")
    public ResponseEntity<Void> updateCategory(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam String category) {
        storageService.updateCategory(userDetails.getUsername(), id, category);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/classification")
    public ResponseEntity<Void> updateClassification(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long id,
            @RequestParam String classification) {
        storageService.updateClassification(userDetails.getUsername(), id, classification);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/analytics")
    public ResponseEntity<StorageDto.Analytics> getAnalytics(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(storageService.getAnalytics(userDetails.getUsername()));
    }
}

