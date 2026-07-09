package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

public class FileVersionDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long id;
        private Long fileId;
        private Integer versionNumber;
        private Integer versionValue;
        private String storagePath;
        private String sha256;
        private Long size;
        private LocalDateTime uploadedAt;
        private String uploadedBy;
        private String contentType;
        private String category;
        private Double confidence;
        private String tags;
        private String changeDescription;
        private Integer restoredFromVersion;
        private boolean currentVersion;
    }
}
