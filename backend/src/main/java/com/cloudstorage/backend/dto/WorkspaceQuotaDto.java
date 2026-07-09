package com.cloudstorage.backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceQuotaDto {
    private Long workspaceId;
    private String workspaceName;
    private Long storageQuota;
    private Long storageUsed;
    private Double usagePercentage;
    private Integer memberLimit;
    private Integer memberCount;
}
