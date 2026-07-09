package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.EntityType;
import com.cloudstorage.backend.entity.NotificationType;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {
    private Long id;
    private Long userId;
    private Long workspaceId;
    private NotificationType notificationType;
    private String title;
    private String message;
    private EntityType referenceType;
    private Long referenceId;
    private boolean read;
    private LocalDateTime createdAt;
}
