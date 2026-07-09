package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShareRequest {
    private String permission; // VIEW, DOWNLOAD, UPLOAD, EDIT, MANAGE
    private String password;
    private LocalDateTime expiresAt;
    private Integer downloadLimit;
    private Integer viewLimit;
    private Boolean allowPreview;
    private Boolean allowDownload;
    private Boolean allowUpload;
    private Boolean allowReshare;
    private Boolean active;
}
