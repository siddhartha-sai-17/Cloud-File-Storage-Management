package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.UploadPriority;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

public class UploadSessionDto {

    @Data
    public static class Request {
        private String filename;
        private Long size;
        private String contentType;
        private Long folderId;
        private Long chunkSize;
        private String clientUploadId;
        private UploadPriority priority;
        private String changeDescription;
    }


    @Data
    @Builder
    public static class Response {
        private String sessionId;
        private String filename;
        private Long size;
        private String status;
        private String clientUploadId;
        private Integer totalChunks;
        private Long chunkSize;
        private Integer uploadedChunks;
        private Long uploadedBytes;
        private LocalDateTime createdAt;
        private LocalDateTime lastActivityAt;
        private LocalDateTime expiresAt;
        private String changeDescription;
    }
}
