package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class PreviewDto {
    private Long fileId;
    private String filename;
    private String contentType;
    private long size;
    private String contentPreview;
    private String thumbnailUrl;
    private Map<String, String> metadata;
}
