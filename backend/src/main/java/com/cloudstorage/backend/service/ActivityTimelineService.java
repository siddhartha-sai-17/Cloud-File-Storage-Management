package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.ActivityTimelineDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ActivityTimelineService {
    Page<ActivityTimelineDto> getWorkspaceActivity(Long workspaceId, Pageable pageable);
    Page<ActivityTimelineDto> getUserActivity(Long userId, Pageable pageable);
    Page<ActivityTimelineDto> getFileActivity(Long fileId, Pageable pageable);
}
