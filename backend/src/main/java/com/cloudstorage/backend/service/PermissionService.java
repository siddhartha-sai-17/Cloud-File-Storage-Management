package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import java.util.List;

public interface PermissionService {
    FilePermissionDto grantFilePermission(String username, Long fileId, FilePermissionDto.GrantRequest request);
    void revokeFilePermission(String username, Long fileId, Long permissionId);
    List<FilePermissionDto> getFilePermissions(String username, Long fileId);
    void clearExpiredPermissions();
}
