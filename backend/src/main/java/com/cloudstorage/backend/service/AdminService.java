package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AdminStatsDto;

public interface AdminService {
    AdminStatsDto getGlobalStats(String username);
}
