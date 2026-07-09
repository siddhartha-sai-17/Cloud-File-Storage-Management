package com.cloudstorage.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "upload_audit_events", indexes = {
    @Index(name = "idx_audit_session", columnList = "sessionId, timestamp"),
    @Index(name = "idx_audit_username", columnList = "username, timestamp"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadAuditEvent {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 36)
    private String sessionId;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(length = 45)
    private String clientIp;

    @Column(length = 255)
    private String userAgent;

    @Column(columnDefinition = "TEXT")
    private String details;

    private Long processingDurationMs;

    @Column(nullable = false, length = 50)
    private String resultStatus;

    private Long workspaceId;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
