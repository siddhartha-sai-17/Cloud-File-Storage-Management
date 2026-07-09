package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.WorkspaceMemberStatus;
import com.cloudstorage.backend.entity.WorkspaceRole;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceMemberDto {
    private Long id;
    private Long workspaceId;
    private Long userId;
    private String username;
    private String email;
    private WorkspaceRole role;
    private WorkspaceMemberStatus status;
    private LocalDateTime joinedAt;
    private LocalDateTime lastActive;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddRequest {
        private String username;
        private WorkspaceRole role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleUpdateRequest {
        private WorkspaceRole role;
    }
}
