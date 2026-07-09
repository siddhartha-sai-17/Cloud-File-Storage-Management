package com.cloudstorage.backend.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FilePermissionDto {
    private Long id;
    private Long fileId;
    private String fileFilename;
    private String username;
    private String permission;
    private String grantedByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GrantRequest {
        private String username;
        private String permission;
        private Integer durationMinutes;
    }
}
