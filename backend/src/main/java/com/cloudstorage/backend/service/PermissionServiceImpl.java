package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final FileRepository fileRepository;
    private final FilePermissionRepository filePermissionRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;
    private final AuthorizationCache authorizationCache;

    private final ConcurrentHashMap<Long, Object> fileLocks = new ConcurrentHashMap<>();

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Override
    @Transactional
    public FilePermissionDto grantFilePermission(String username, Long fileId, FilePermissionDto.GrantRequest request) {
        User operator = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));

        if (!file.getUser().getId().equals(operator.getId()) && !operator.isSysAdmin()) {
            authorizationService.checkFilePermission(username, fileId, "SHARE");
        }

        User targetUser = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Target user not found: " + request.getUsername()));

        Object lock = fileLocks.computeIfAbsent(fileId, k -> new Object());
        synchronized (lock) {
            Optional<FilePermission> existing = filePermissionRepository.findByFileAndUserAndPermission(file, targetUser, request.getPermission());
            if (existing.isPresent()) {
                FilePermission fp = existing.get();
                fp.setExpiresAt(request.getDurationMinutes() != null ? LocalDateTime.now().plusMinutes(request.getDurationMinutes()) : null);
                fp.setGrantedBy(operator);
                fp = filePermissionRepository.save(fp);
                authorizationCache.evictFilePermissions(fileId);
                authorizationCache.evictUserPermissions(targetUser.getUsername());
                return mapToDto(fp);
            }

            FilePermission fp = FilePermission.builder()
                    .file(file)
                    .user(targetUser)
                    .permission(request.getPermission())
                    .grantedBy(operator)
                    .expiresAt(request.getDurationMinutes() != null ? LocalDateTime.now().plusMinutes(request.getDurationMinutes()) : null)
                    .build();

            fp = filePermissionRepository.save(fp);
            
            authorizationCache.evictFilePermissions(fileId);
            authorizationCache.evictUserPermissions(targetUser.getUsername());

            return mapToDto(fp);
        }
    }

    @Override
    @Transactional
    public void revokeFilePermission(String username, Long fileId, Long permissionId) {
        User operator = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));

        if (!file.getUser().getId().equals(operator.getId()) && !operator.isSysAdmin()) {
            authorizationService.checkFilePermission(username, fileId, "SHARE");
        }

        Object lock = fileLocks.computeIfAbsent(fileId, k -> new Object());
        synchronized (lock) {
            FilePermission fp = filePermissionRepository.findById(permissionId)
                    .orElseThrow(() -> new RuntimeException("File permission not found: " + permissionId));

            if (!fp.getFile().getId().equals(fileId)) {
                throw new RuntimeException("Permission does not belong to this file");
            }

            filePermissionRepository.delete(fp);

            authorizationCache.evictFilePermissions(fileId);
            authorizationCache.evictUserPermissions(fp.getUser().getUsername());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<FilePermissionDto> getFilePermissions(String username, Long fileId) {
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));

        authorizationService.checkFilePermission(username, fileId, "READ");

        return filePermissionRepository.findByFile(file).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void clearExpiredPermissions() {
        int count = filePermissionRepository.deleteExpiredPermissions(LocalDateTime.now());
        if (count > 0) {
            authorizationCache.clear();
        }
    }

    private FilePermissionDto mapToDto(FilePermission fp) {
        return FilePermissionDto.builder()
                .id(fp.getId())
                .fileId(fp.getFile().getId())
                .fileFilename(fp.getFile().getFilename())
                .username(fp.getUser().getUsername())
                .permission(fp.getPermission())
                .grantedByUsername(fp.getGrantedBy().getUsername())
                .createdAt(fp.getCreatedAt())
                .expiresAt(fp.getExpiresAt())
                .build();
    }
}
