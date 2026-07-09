package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.ActivityType;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceActivityDto {
    private Long id;
    private Long workspaceId;
    private String username;
    private ActivityType activityType;
    private String ip;
    private String userAgent;
    private Long duration;
    private String result;
    private LocalDateTime createdAt;
}
