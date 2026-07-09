package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.DuplicateGroupDto;
import java.util.List;
import java.util.Map;

public interface DuplicateDetectionService {
    List<DuplicateGroupDto> getDuplicateReport(String username);
    Map<String, Object> getStorageSavingStats(String username);
}
