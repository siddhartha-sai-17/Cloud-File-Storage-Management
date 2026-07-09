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
public class SharePreviewDto {
    private UUID shareLinkId;
    private String fileName;
    private long size;
    private String contentType;
    private String shareType;
    private boolean allowPreview;
    private boolean allowDownload;
    private boolean allowUpload;
    private boolean passwordRequired;
    private String workspaceName;
    private String ownerName;
    private LocalDateTime expiresAt;
}
