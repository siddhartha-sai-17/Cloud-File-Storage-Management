package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.PreviewDto;

public interface PreviewService {
    PreviewDto getPreview(String username, Long fileId);
}
