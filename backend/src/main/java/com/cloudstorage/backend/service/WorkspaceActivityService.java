package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.WorkspaceActivityDto;
import com.cloudstorage.backend.entity.ActivityType;

import java.util.List;

public interface WorkspaceActivityService {
    void logActivity(Long workspaceId, Long userId, ActivityType activityType, String result);
    void logActivityDetailed(Long workspaceId, Long userId, ActivityType activityType, String ip, String userAgent, Long duration, String result);
    List<WorkspaceActivityDto> getWorkspaceActivity(Long workspaceId);
}
