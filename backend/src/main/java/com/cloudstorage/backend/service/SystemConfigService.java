package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.SystemConfigDto;
import java.util.List;

public interface SystemConfigService {
    SystemConfigDto getConfig(String key);
    String getValue(String key, String defaultValue);
    int getValueAsInt(String key, int defaultValue);
    long getValueAsLong(String key, long defaultValue);
    boolean getValueAsBoolean(String key, boolean defaultValue);
    SystemConfigDto setConfig(String username, String key, String value);
    List<SystemConfigDto> getAllConfigs();
}
