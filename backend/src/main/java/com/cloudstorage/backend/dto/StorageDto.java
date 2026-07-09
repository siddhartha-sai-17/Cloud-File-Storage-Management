package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

public class StorageDto {

    @Data
    @Builder
    public static class Item {
        private Long id;
        private String name;
        private String type; // "FILE" or "FOLDER"
        private Long size;
        private LocalDateTime createdDate;
        private boolean starred;
        private String category;
        private Double confidenceScore;
        private String tags;
        private Integer versionValue;
        private String classification;
    }

    @Data
    @Builder
    public static class Analytics {
        private long storageUsage;      // total size in bytes of all active (non-deleted) files
        private long fileCount;         // total count of active files
        private long duplicateSavings;  // total bytes saved through deduplication
        private long starredCount;      // total count of active starred files
        private long trashCount;        // total count of soft-deleted files and folders
    }
}

