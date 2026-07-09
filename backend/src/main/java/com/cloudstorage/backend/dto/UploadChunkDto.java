package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

public class UploadChunkDto {

    @Data
    @Builder
    public static class Response {
        private String sessionId;
        private Integer chunkNumber;
        private Integer uploadedChunks;
        private Long uploadedBytes;
        private Integer totalChunks;
        private Double uploadPercentage;
        private Integer remainingChunks;
        private LocalDateTime lastActivityAt;
        private String status;
    }
}
