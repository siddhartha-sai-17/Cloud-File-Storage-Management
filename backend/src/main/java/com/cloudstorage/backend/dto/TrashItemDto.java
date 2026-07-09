package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class TrashItemDto {
    private Long id;
    private String name;
    private String type; // "FILE" or "FOLDER"
    private Long size;
    private LocalDateTime deletedAt;
    private String deletedBy;
}
