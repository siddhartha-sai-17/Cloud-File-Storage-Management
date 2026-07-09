package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.WorkspaceStatus;
import com.cloudstorage.backend.entity.WorkspaceType;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceDto {
    private Long id;
    private String name;
    private String description;
    private String ownerUsername;
    private WorkspaceType workspaceType;
    private Long storageQuota;
    private Long storageUsed;
    private Integer memberLimit;
    private WorkspaceStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private String name;
        private String description;
        private WorkspaceType workspaceType;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String name;
        private String description;
        private WorkspaceStatus status;
        private Long storageQuota;
        private Integer memberLimit;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferRequest {
        private String newOwnerUsername;
    }
}
