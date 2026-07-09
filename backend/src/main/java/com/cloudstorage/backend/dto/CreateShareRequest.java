package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateShareRequest {
    private Long fileId;
    private Long workspaceId;
    private String shareType; // PRIVATE, INTERNAL, PUBLIC, ANONYMOUS
    private String permission; // VIEW, DOWNLOAD, UPLOAD, EDIT, MANAGE
    private String password;
    private LocalDateTime expiresAt;
    private Integer downloadLimit;
    private Integer viewLimit;
    private Boolean allowPreview;
    private Boolean allowDownload;
    private Boolean allowUpload;
    private Boolean allowReshare;
    private List<String> targetUsernames;
}
