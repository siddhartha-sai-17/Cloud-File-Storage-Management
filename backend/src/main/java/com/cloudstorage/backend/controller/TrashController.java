package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.TrashItemDto;
import com.cloudstorage.backend.service.TrashService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trash")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Trash Management", description = "Endpoints for managing soft-deleted files and folders in the trash bin")
public class TrashController {

    private final TrashService trashService;

    @Data
    public static class BulkTrashRequest {
        private List<Long> fileIds;
        private List<Long> folderIds;
    }

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(
            summary = "List soft-deleted items",
            description = "Retrieve all files and folders currently in the user's trash bin"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "List of trash items successfully retrieved")
    public ResponseEntity<List<TrashItemDto>> listTrash(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(trashService.listTrash(userDetails.getUsername()));
    }

    @PostMapping("/{id}/restore")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Restore trash item",
            description = "Restore a soft-deleted file or folder back to its original location"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Item restored successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Item not found in trash bin")
    })
    public ResponseEntity<Void> restoreItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "ID of the file/folder to restore", required = true)
            @PathVariable Long id,
            @io.swagger.v3.oas.annotations.Parameter(description = "Flag specifying if the item is a folder")
            @RequestParam(defaultValue = "false") boolean isFolder) {
        trashService.restoreItem(userDetails.getUsername(), id, isFolder);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Permanently delete item",
            description = "Completely purge a file or folder from database and MinIO storage"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Item permanently deleted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Item not found")
    })
    public ResponseEntity<Void> permanentDeleteItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "ID of the file/folder to purge", required = true)
            @PathVariable Long id,
            @io.swagger.v3.oas.annotations.Parameter(description = "Flag specifying if the item is a folder")
            @RequestParam(defaultValue = "false") boolean isFolder) {
        trashService.permanentDeleteItem(userDetails.getUsername(), id, isFolder);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/restore/bulk")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Bulk restore items",
            description = "Restore multiple files and folders in a single batch operation"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Bulk restore completed")
    public ResponseEntity<Void> bulkRestore(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody BulkTrashRequest request) {
        trashService.bulkRestore(userDetails.getUsername(), request.getFileIds(), request.getFolderIds());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/delete/bulk")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Bulk permanently delete items",
            description = "Completely purge multiple files and folders in a single batch operation"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Bulk permanent delete completed")
    public ResponseEntity<Void> bulkPermanentDelete(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody BulkTrashRequest request) {
        trashService.bulkPermanentDelete(userDetails.getUsername(), request.getFileIds(), request.getFolderIds());
        return ResponseEntity.ok().build();
    }
}
