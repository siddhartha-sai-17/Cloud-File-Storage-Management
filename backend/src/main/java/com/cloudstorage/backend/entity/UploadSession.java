package com.cloudstorage.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "upload_sessions", indexes = {
    @Index(name = "idx_upload_session_user", columnList = "user_id"),
    @Index(name = "idx_upload_session_status", columnList = "status"),
    @Index(name = "idx_upload_session_expires", columnList = "expiresAt"),
    @Index(name = "idx_upload_session_created", columnList = "createdAt")
})
@Data
public class UploadSession {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private Long size;

    @Column(nullable = false)
    private String contentType;

    private Long folderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Long workspaceId;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UploadSessionStatus status;

    @Column(nullable = false, length = 100)
    private String clientUploadId;

    private String checksum;

    @Column(nullable = false)
    private Integer totalChunks;

    @Column(nullable = false)
    private Long chunkSize;

    @Column(nullable = false)
    private Integer uploadedChunks = 0;

    @Column(nullable = false)
    private Long uploadedBytes = 0L;

    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime lastActivityAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime completedAt;

    private Long averageChunkSize;

    private LocalDateTime uploadStartedAt;

    private Integer lastUploadedChunk;

    private Long uploadDuration;

    private Long fileId;

    private Boolean deduplicated;

    private LocalDateTime pausedAt;

    private LocalDateTime resumedAt;

    @Column(length = 100)
    private String lastPausedBy;

    @Column(nullable = false)
    private Integer resumeCount = 0;

    private Long progressVersion = 0L;

    private Double uploadPercentage = 0.0;

    private Long currentSpeedBps = 0L;

    private Long averageSpeedBps = 0L;

    private Long peakSpeedBps = 0L;

    private Long etaSeconds = 0L;

    private LocalDateTime lastProgressUpdate;

    private LocalDateTime lastChunkCompleted;

    @Column(name = "change_description", length = 500)
    private String changeDescription;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (lastActivityAt == null) {
            lastActivityAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        lastActivityAt = LocalDateTime.now();
    }
}
