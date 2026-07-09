package com.cloudstorage.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "uploaded_chunks",
       uniqueConstraints = {
           @UniqueConstraint(name = "uc_chunk_session_number", columnNames = {"session_id", "chunkNumber"})
       },
       indexes = {
           @Index(name = "idx_uploaded_chunk_session", columnList = "session_id"),
           @Index(name = "idx_uploaded_chunk_status", columnList = "status")
       })
@Data
public class UploadedChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private UploadSession uploadSession;

    @Column(nullable = false)
    private Integer chunkNumber;

    @Column(nullable = false)
    private Long chunkSize;

    @Column(nullable = false, length = 64)
    private String checksum;

    @Column(nullable = false, length = 512)
    private String filePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChunkStatus status;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    @Column
    private LocalDateTime verifiedAt;

    @Column(nullable = false, length = 50)
    private String checksumAlgorithm = "SHA-256";

    @Column(nullable = false)
    private Integer retryCount = 0;

    @Column(length = 255)
    private String lastFailureReason;

    @Column
    private LocalDateTime lastFailureAt;

    @Column
    private LocalDateTime lastRetryAt;

    @Column(length = 255)
    private String lastRetryReason;

    @Column
    private Long lastRetryDuration;

    @Column
    private LocalDateTime nextRetryAt;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
    }
}
