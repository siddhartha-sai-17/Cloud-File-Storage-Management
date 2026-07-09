package com.cloudstorage.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_versions", uniqueConstraints = {
    @UniqueConstraint(name = "uc_file_version_number", columnNames = {"file_id", "version_number"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    private FileMetadata fileMetadata;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "version_value", nullable = false)
    private Integer versionValue;

    @Column(name = "storage_path", nullable = false, length = 512)
    private String storagePath;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false)
    private Long size;

    @Column(name = "upload_date", nullable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "uploaded_by", nullable = false)
    private String uploadedBy;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    private String category;

    private Double confidence;

    @Column(length = 500)
    private String tags;

    @Column(name = "change_description", length = 500)
    private String changeDescription;

    @Column(name = "restored_from_version")
    private Integer restoredFromVersion;

    @Builder.Default
    @Column(name = "current_version", nullable = false)
    private boolean currentVersion = false;
}
