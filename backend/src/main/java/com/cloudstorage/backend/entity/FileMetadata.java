package com.cloudstorage.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "files", indexes = {
    @Index(name = "idx_files_user", columnList = "user_id"),
    @Index(name = "idx_files_workspace", columnList = "workspace_id"),
    @Index(name = "idx_files_deleted", columnList = "deleted"),
    @Index(name = "idx_files_sha256", columnList = "sha256"),
    @Index(name = "idx_files_starred", columnList = "starred"),
    @Index(name = "idx_files_upload_date", columnList = "uploadDate")
})
@Data
public class FileMetadata {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private Long size; // bytes

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private String storagePath; // MinIO path

    @Column(nullable = false)
    private LocalDateTime uploadDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder; // Null means root directory

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;


    @Column(nullable = false)
    private boolean starred = false;

    @Column(nullable = false)
    private boolean deleted = false;

    private LocalDateTime deletedAt;

    @Column(length = 64)
    private String sha256;

    private String category;

    private Double confidenceScore;

    @Column(length = 500)
    private String tags;

    @Column(nullable = false)
    private Integer versionValue = 1;

    @Column(nullable = false)
    private String classification = "Internal";

    private LocalDateTime lastIndexedAt;

    @Column(nullable = false)
    private boolean searchable = true;

    @Column(nullable = false)
    private boolean ocrIndexed = false;

    @OneToOne(mappedBy = "fileMetadata", cascade = CascadeType.ALL, orphanRemoval = true)
    private OcrContent ocrContent;

    @OneToMany(mappedBy = "file", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        uploadDate = LocalDateTime.now();
    }
}
