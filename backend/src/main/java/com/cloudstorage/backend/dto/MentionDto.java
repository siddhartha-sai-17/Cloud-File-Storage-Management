package com.cloudstorage.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MentionDto {
    private Long id;
    private Long commentId;
    private Long mentionedUserId;
    private String mentionedUsername;
    private LocalDateTime createdAt;
    private boolean read;
}
