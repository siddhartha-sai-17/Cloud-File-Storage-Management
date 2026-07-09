package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultDto {
    private Long fileId;
    private String filename;
    private String owner;
    private String folder;
    private String category;
    private double score;
    private List<String> matchedFields;
    private String snippet;
    private List<String> highlights;

    // Added for Phase 6 (Multi-Entity Search)
    private String entityType; // FILE, COMMENT, AUDIT
    private Long entityId;
    private String title; // Generic title for non-file entities
}
