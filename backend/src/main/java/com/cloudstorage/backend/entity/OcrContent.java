package com.cloudstorage.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "ocr_contents", indexes = {
    @Index(name = "idx_ocr_status", columnList = "processing_status"),
    @Index(name = "idx_ocr_indexed_at", columnList = "indexed_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false, unique = true)
    private FileMetadata fileMetadata;

    @Lob
    @Column(name = "extracted_text", columnDefinition = "MEDIUMTEXT")
    private String extractedText;

    @Column(length = 10)
    private String language;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "indexed_at")
    private LocalDateTime indexedAt;

    @Column(name = "ocr_engine", length = 50)
    private String ocrEngine;

    @Column(name = "processing_status", nullable = false, length = 20)
    private String processingStatus; // PENDING, PROCESSING, COMPLETED, FAILED

    private Double confidence;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "last_error", length = 500)
    private String lastError;
}
