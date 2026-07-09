package com.cloudstorage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "share_links", indexes = {
    @Index(name = "idx_share_token", columnList = "token"),
    @Index(name = "idx_share_workspace", columnList = "workspace_id"),
    @Index(name = "idx_share_created_by", columnList = "created_by"),
    @Index(name = "idx_share_expires_at", columnList = "expires_at"),
    @Index(name = "idx_share_file_id", columnList = "file_id"),
    @Index(name = "idx_share_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShareLink {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id")
    private FileMetadata fileMetadata;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "share_type", nullable = false)
    private ShareType shareType;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission", nullable = false)
    private PermissionLevel permission;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "download_limit")
    private Integer downloadLimit;

    @Column(name = "download_count", nullable = false)
    private int downloadCount = 0;

    @Column(name = "view_limit")
    private Integer viewLimit;

    @Column(name = "view_count", nullable = false)
    private int viewCount = 0;

    @Column(name = "allow_preview", nullable = false)
    private boolean allowPreview = true;

    @Column(name = "allow_download", nullable = false)
    private boolean allowDownload = true;

    @Column(name = "allow_upload", nullable = false)
    private boolean allowUpload = false;

    @Column(name = "allow_reshare", nullable = false)
    private boolean allowReshare = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
