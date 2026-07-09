package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RecentFilesService {
    Page<StorageDto.Item> getRecentFiles(String username, String type, Pageable pageable);
}
