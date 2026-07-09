package com.cloudstorage.backend.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDto {
    private Long id;
    private Long fileId;
    private Long workspaceId;
    private Long userId;
    private String username;
    private Long parentCommentId;
    private String content;
    private boolean edited;
    private boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<CommentDto> replies = new ArrayList<>();
}
