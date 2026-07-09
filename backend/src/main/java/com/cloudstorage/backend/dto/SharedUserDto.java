package com.cloudstorage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SharedUserDto {
    private Long id;
    private UUID shareLinkId;
    private String username;
    private String email;
    private String permission;
    private boolean accepted;
    private LocalDateTime acceptedAt;
}
