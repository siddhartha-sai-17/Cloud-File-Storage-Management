package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class UploadIntegrityReportDto {
    private boolean integrityPassed;
    private String sessionId;
    private String status;
    private int totalChunks;
    private int verifiedChunks;
    private int uploadedChunks;
    private int missingChunksCount;
    private int corruptedChunksCount;
    private List<Integer> corruptedChunks;
    private List<Integer> missingChunks;
    private List<Integer> failedChunks;
    private long verificationDuration; // in milliseconds
    private LocalDateTime verifiedAt;
    private String checksumAlgorithm;
    private List<ChunkVerificationDetail> details;

    @Data
    @Builder
    public static class ChunkVerificationDetail {
        private int chunkNumber;
        private String status;
        private String checksum;
        private boolean valid;
        private String error;
        private Long expectedSize;
        private Long actualSize;
    }
}
