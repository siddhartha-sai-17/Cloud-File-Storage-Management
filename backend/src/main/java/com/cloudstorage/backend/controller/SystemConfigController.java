package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.SystemConfigDto;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/config")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "System Configuration", description = "Endpoints for managing runtime system configurations (Sysadmin only)")
public class SystemConfigController {

    private final SystemConfigService systemConfigService;
    private final UserRepository userRepository;

    private void validateSysAdmin(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found"));
        if (!user.isSysAdmin()) {
            throw new PermissionDeniedException("Sysadmin privileges required");
        }
    }

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get all configuration parameters",
            description = "Retrieve all runtime system configurations (Requires Sysadmin role)"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Configurations successfully retrieved"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied due to insufficient privileges")
    })
    public ResponseEntity<List<SystemConfigDto>> getAllConfigs(
            @AuthenticationPrincipal UserDetails userDetails) {
        validateSysAdmin(userDetails.getUsername());
        return ResponseEntity.ok(systemConfigService.getAllConfigs());
    }

    @GetMapping("/{key}")
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get configuration by key",
            description = "Retrieve a specific system configuration parameter (Requires Sysadmin role)"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Configuration details successfully retrieved"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Configuration key not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<SystemConfigDto> getConfig(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "Configuration setting key", required = true)
            @PathVariable String key) {
        validateSysAdmin(userDetails.getUsername());
        SystemConfigDto dto = systemConfigService.getConfig(key);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Update configuration parameter",
            description = "Update or create a specific system configuration parameter (Requires Sysadmin role)"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Configuration updated successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<SystemConfigDto> setConfig(
            @AuthenticationPrincipal UserDetails userDetails,
            @io.swagger.v3.oas.annotations.Parameter(description = "Configuration key", required = true)
            @RequestParam String key,
            @io.swagger.v3.oas.annotations.Parameter(description = "New value for configuration key", required = true)
            @RequestParam String value) {
        validateSysAdmin(userDetails.getUsername());
        return ResponseEntity.ok(systemConfigService.setConfig(userDetails.getUsername(), key, value));
    }
}
