package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.*;
import com.cloudstorage.backend.service.WorkspaceInvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WorkspaceInvitationController {

    private final WorkspaceInvitationService workspaceInvitationService;

    @PostMapping("/workspaces/{id}/invite")
    public ResponseEntity<WorkspaceInvitationDto> inviteMember(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody WorkspaceInvitationDto.InviteRequest request) {
        return ResponseEntity.ok(workspaceInvitationService.inviteMember(userDetails.getUsername(), id, request));
    }

    @PostMapping("/workspaces/invitations/{token}/accept")
    public ResponseEntity<WorkspaceMemberDto> acceptInvitation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String token) {
        return ResponseEntity.ok(workspaceInvitationService.acceptInvitation(userDetails.getUsername(), token));
    }

    @PostMapping("/workspaces/invitations/{token}/reject")
    public ResponseEntity<Void> rejectInvitation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String token) {
        workspaceInvitationService.rejectInvitation(userDetails.getUsername(), token);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/workspaces/invitations/{id}")
    public ResponseEntity<Void> cancelInvitation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        workspaceInvitationService.cancelInvitation(userDetails.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/workspaces/{id}/invitations")
    public ResponseEntity<List<WorkspaceInvitationDto>> listInvitations(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(workspaceInvitationService.listInvitations(userDetails.getUsername(), id));
    }
}
