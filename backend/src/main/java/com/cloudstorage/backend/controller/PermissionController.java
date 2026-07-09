package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.FilePermissionDto;
import com.cloudstorage.backend.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/files/{id}/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<FilePermissionDto> grantFilePermission(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody FilePermissionDto.GrantRequest request) {
        return ResponseEntity.ok(permissionService.grantFilePermission(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{permissionId}")
    public ResponseEntity<Void> revokeFilePermission(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @PathVariable Long permissionId) {
        permissionService.revokeFilePermission(userDetails.getUsername(), id, permissionId);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<FilePermissionDto>> getFilePermissions(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(permissionService.getFilePermissions(userDetails.getUsername(), id));
    }
}
