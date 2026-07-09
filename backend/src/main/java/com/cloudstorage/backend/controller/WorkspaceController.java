package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.WorkspaceActivityDto;
import com.cloudstorage.backend.dto.WorkspaceDto;
import com.cloudstorage.backend.dto.WorkspaceQuotaDto;
import com.cloudstorage.backend.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping
    public ResponseEntity<WorkspaceDto> createWorkspace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody WorkspaceDto.CreateRequest request) {
        return ResponseEntity.ok(workspaceService.createWorkspace(userDetails.getUsername(), request));
    }

    @GetMapping
    public ResponseEntity<List<WorkspaceDto>> listWorkspaces(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(workspaceService.listWorkspaces(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkspaceDto> getWorkspace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.getWorkspace(userDetails.getUsername(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkspaceDto> updateWorkspace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody WorkspaceDto.UpdateRequest request) {
        return ResponseEntity.ok(workspaceService.updateWorkspace(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkspace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        workspaceService.deleteWorkspace(userDetails.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/transfer")
    public ResponseEntity<WorkspaceDto> transferOwnership(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody WorkspaceDto.TransferRequest request) {
        return ResponseEntity.ok(workspaceService.transferOwnership(userDetails.getUsername(), id, request));
    }

    @GetMapping("/{id}/quota")
    public ResponseEntity<WorkspaceQuotaDto> getWorkspaceQuota(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.getWorkspaceQuota(userDetails.getUsername(), id));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<WorkspaceDto> archiveWorkspace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.archiveWorkspace(userDetails.getUsername(), id));
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<WorkspaceDto> restoreWorkspace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.restoreWorkspace(userDetails.getUsername(), id));
    }

    @GetMapping("/{id}/activity")
    public ResponseEntity<List<WorkspaceActivityDto>> getWorkspaceActivity(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.getWorkspaceActivity(userDetails.getUsername(), id));
    }
}
