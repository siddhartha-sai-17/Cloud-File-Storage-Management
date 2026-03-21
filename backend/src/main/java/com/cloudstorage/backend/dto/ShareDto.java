package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ShareDto {
    private Long id;
    private Long fileId;
    private String fileName;
    private String token;
    private String shareLink;
    private LocalDateTime createdAt;
    private boolean active;
}
