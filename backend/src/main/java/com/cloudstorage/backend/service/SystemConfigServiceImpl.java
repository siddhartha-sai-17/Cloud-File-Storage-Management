package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AuditMetadata;
import com.cloudstorage.backend.dto.SystemConfigDto;
import com.cloudstorage.backend.entity.AuditEventType;
import com.cloudstorage.backend.entity.EntityType;
import com.cloudstorage.backend.entity.SystemConfig;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.repository.SystemConfigRepository;
import com.cloudstorage.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigRepository systemConfigRepository;
    private final Environment environment;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Override
    public SystemConfigDto getConfig(String key) {
        SystemConfig config = systemConfigRepository.findById(key).orElse(null);
        if (config != null) {
            return mapToDto(config);
        }
        // Fall back to environment properties
        String envVal = environment.getProperty(key);
        if (envVal != null) {
            return SystemConfigDto.builder()
                    .key(key)
                    .value(envVal)
                    .updatedAt(LocalDateTime.now())
                    .build();
        }
        return null;
    }

    @Override
    public String getValue(String key, String defaultValue) {
        SystemConfigDto dto = getConfig(key);
        return dto != null ? dto.getValue() : defaultValue;
    }

    @Override
    public int getValueAsInt(String key, int defaultValue) {
        String val = getValue(key, null);
        if (val == null) return defaultValue;
        try {
            return Integer.parseInt(val);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    @Override
    public long getValueAsLong(String key, long defaultValue) {
        String val = getValue(key, null);
        if (val == null) return defaultValue;
        try {
            return Long.parseLong(val);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    @Override
    public boolean getValueAsBoolean(String key, boolean defaultValue) {
        String val = getValue(key, null);
        if (val == null) return defaultValue;
        return Boolean.parseBoolean(val);
    }

    @Override
    @Transactional
    public SystemConfigDto setConfig(String username, String key, String value) {
        SystemConfig config = systemConfigRepository.findById(key)
                .orElse(new SystemConfig());
        config.setKey(key);
        config.setValue(value);
        config.setUpdatedAt(LocalDateTime.now());
        systemConfigRepository.save(config);

        User user = userRepository.findByUsername(username).orElse(null);
        Long userId = user != null ? user.getId() : null;

        auditService.logEvent(
                null,
                userId,
                username,
                AuditEventType.SYSTEM_CONFIG_UPDATED,
                EntityType.SYSTEM_CONFIG,
                null,
                "Updated system config: " + key + " = " + value,
                "SUCCESS",
                new AuditMetadata()
        );

        return mapToDto(config);
    }

    @Override
    public List<SystemConfigDto> getAllConfigs() {
        return systemConfigRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private SystemConfigDto mapToDto(SystemConfig config) {
        return SystemConfigDto.builder()
                .key(config.getKey())
                .value(config.getValue())
                .updatedAt(config.getUpdatedAt())
                .build();
    }
}
