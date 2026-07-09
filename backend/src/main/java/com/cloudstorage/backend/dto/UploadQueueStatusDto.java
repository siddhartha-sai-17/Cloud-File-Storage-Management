package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.UploadPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadQueueStatusDto {
    private String sessionId;
    private String filename;
    private Long fileSize;
    private UploadPriority priority;
    private int queuePosition;
    private LocalDateTime enqueuedAt;
    private long waitTimeMs;
    private int totalQueueSize;
    private int highPriorityAhead;
    private int normalPriorityAhead;
    private int lowPriorityAhead;
    private boolean promoted;
}
