package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.InvitationStatus;
import com.cloudstorage.backend.entity.WorkspaceRole;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceInvitationDto {
    private Long id;
    private Long workspaceId;
    private String email;
    private String token;
    private LocalDateTime expiresAt;
    private InvitationStatus status;
    private String createdByUsername;
    private LocalDateTime createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InviteRequest {
        private String email;
        private WorkspaceRole role; // optional, defaults to VIEWER if not specified
    }
}
