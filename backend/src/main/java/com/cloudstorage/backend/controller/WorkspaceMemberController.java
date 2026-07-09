package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.WorkspaceMemberDto;
import com.cloudstorage.backend.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces/{id}/members")
@RequiredArgsConstructor
public class WorkspaceMemberController {

    private final WorkspaceService workspaceService;

    @GetMapping
    public ResponseEntity<List<WorkspaceMemberDto>> listMembers(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.listMembers(userDetails.getUsername(), id));
    }

    @PostMapping
    public ResponseEntity<WorkspaceMemberDto> addMember(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody WorkspaceMemberDto.AddRequest request) {
        return ResponseEntity.ok(workspaceService.addMember(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @PathVariable Long userId) {
        workspaceService.removeMember(userDetails.getUsername(), id, userId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<WorkspaceMemberDto> updateMemberRole(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestBody WorkspaceMemberDto.RoleUpdateRequest request) {
        return ResponseEntity.ok(workspaceService.updateMemberRole(userDetails.getUsername(), id, userId, request));
    }

    @PostMapping("/leave")
    public ResponseEntity<Void> leaveWorkspace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        workspaceService.leaveWorkspace(userDetails.getUsername(), id);
        return ResponseEntity.ok().build();
    }
}
