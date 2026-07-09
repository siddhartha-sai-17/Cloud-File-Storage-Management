package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageAnalyticsDto;

public interface StorageAnalyticsService {
    StorageAnalyticsDto getWorkspaceAnalytics(String username, Long workspaceId);
}
