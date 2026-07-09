package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareLinkDto {
    private UUID id;
    private String token;
    private Long fileId;
    private String fileName;
    private Long workspaceId;
    private String workspaceName;
    private String createdBy;
    private String shareType;
    private String permission;
    private LocalDateTime expiresAt;
    private Integer downloadLimit;
    private int downloadCount;
    private Integer viewLimit;
    private int viewCount;
    private boolean allowPreview;
    private boolean allowDownload;
    private boolean allowUpload;
    private boolean allowReshare;
    private boolean active;
    private LocalDateTime lastAccessedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
