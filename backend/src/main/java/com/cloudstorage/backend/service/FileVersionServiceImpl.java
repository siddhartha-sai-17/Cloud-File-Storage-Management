package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.FileVersion;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.repository.FileVersionRepository;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
@RequiredArgsConstructor
public class FileVersionServiceImpl implements FileVersionService {

    private final FileVersionRepository fileVersionRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final UploadAuditService uploadAuditService;
    private final ObjectStorageService objectStorageService;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    private final ConcurrentHashMap<String, ReentrantLock> fileLocks = new ConcurrentHashMap<>();

    @Override
    public ReentrantLock getFileLock(String username, Long folderId, String filename) {
        String key = username + ":" + (folderId != null ? folderId : "root") + ":" + filename;
        return fileLocks.computeIfAbsent(key, k -> new ReentrantLock());
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Override
    @Transactional
    public FileVersion createNewVersion(
            FileMetadata file,
            String storagePath,
            String sha256,
            long size,
            String contentType,
            String category,
            Double confidence,
            String tags,
            String changeDescription,
            Integer restoredFromVersion,
            String username,
            boolean isNewFile) {

        List<FileVersion> versions = fileVersionRepository.findByFileMetadataOrderByVersionNumberDesc(file);
        int newVersionNumber = 1;

        if (!versions.isEmpty()) {
            newVersionNumber = versions.get(0).getVersionNumber() + 1;
        } else {
            // Lazily create Version 1 representing pre-existing state ONLY if it is NOT a new file
            if (!isNewFile && file.getStoragePath() != null && !file.getStoragePath().isEmpty()) {
                FileVersion v1 = FileVersion.builder()
                        .fileMetadata(file)
                        .versionNumber(1)
                        .versionValue(1)
                        .storagePath(file.getStoragePath())
                        .sha256(file.getSha256())
                        .size(file.getSize())
                        .uploadedAt(file.getUploadDate() != null ? file.getUploadDate() : LocalDateTime.now())
                        .uploadedBy(file.getUser().getUsername())
                        .contentType(file.getContentType())
                        .category(file.getCategory())
                        .confidence(file.getConfidenceScore())
                        .tags(file.getTags())
                        .currentVersion(false)
                        .build();
                fileVersionRepository.save(v1);
                newVersionNumber = 2;
            }
        }

        // Demote all current versions
        fileVersionRepository.demoteCurrentVersions(file.getId());

        FileVersion newVersion = FileVersion.builder()
                .fileMetadata(file)
                .versionNumber(newVersionNumber)
                .versionValue(newVersionNumber)
                .storagePath(storagePath)
                .sha256(sha256)
                .size(size)
                .uploadedAt(LocalDateTime.now())
                .uploadedBy(username)
                .contentType(contentType)
                .category(category)
                .confidence(confidence)
                .tags(tags)
                .changeDescription(changeDescription)
                .restoredFromVersion(restoredFromVersion)
                .currentVersion(true)
                .build();

        newVersion = fileVersionRepository.save(newVersion);

        // Update FileMetadata
        file.setStoragePath(storagePath);
        file.setSha256(sha256);
        file.setSize(size);
        file.setContentType(contentType);
        file.setCategory(category);
        file.setConfidenceScore(confidence);
        file.setVersionValue(newVersionNumber);
        fileRepository.save(file);

        uploadAuditService.logEvent(null, username, "VERSION_CREATED", "SUCCESS",
                "FileId: " + file.getId() + ", Version: " + newVersionNumber + ", Size: " + size, null);

        User u = null;
        try {
            u = getUser(username);
        } catch (Exception e) {}
        
        if (u != null) {
            auditService.logEvent(file.getWorkspace() != null ? file.getWorkspace().getId() : null,
                u.getId(), username, com.cloudstorage.backend.entity.AuditEventType.VERSION_CREATED,
                com.cloudstorage.backend.entity.EntityType.VERSION, newVersion.getId(),
                "Created version " + newVersionNumber + " for file " + file.getFilename(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
        }

        return newVersion;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<FileVersion> getVersionHistory(
            String username,
            Long fileId,
            int page,
            int size,
            String sortBy,
            String direction,
            String uploadedBy,
            String contentType) {

        User user = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        authorizationService.checkFilePermission(username, fileId, "READ");

        Sort.Direction dir = Sort.Direction.fromString(direction);
        Sort sort = Sort.by(dir, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        return fileVersionRepository.filterVersions(file, uploadedBy, contentType, pageable);
    }

    @Override
    @Transactional
    public FileVersion getVersionMetadata(String username, Long fileId, Long versionId) {
        User user = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        authorizationService.checkFilePermission(username, fileId, "READ");

        FileVersion version = fileVersionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        if (!version.getFileMetadata().getId().equals(fileId)) {
            throw new RuntimeException("Version does not belong to the requested file");
        }

        uploadAuditService.logEvent(null, username, "VERSION_VIEWED", "SUCCESS",
                "FileId: " + fileId + ", VersionId: " + versionId + ", Version: " + version.getVersionNumber(), null);

        return version;
    }

    @Override
    @Transactional
    public FileVersion restoreVersion(String username, Long fileId, Long versionId) {
        User user = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        authorizationService.checkFilePermission(username, fileId, "RESTORE");

        FileVersion targetVersion = fileVersionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        if (!targetVersion.getFileMetadata().getId().equals(fileId)) {
            throw new RuntimeException("Version does not belong to the requested file");
        }

        List<FileVersion> versions = fileVersionRepository.findByFileMetadataOrderByVersionNumberDesc(file);
        int newVersionNumber = 1;
        if (!versions.isEmpty()) {
            newVersionNumber = versions.get(0).getVersionNumber() + 1;
        }

        // Demote all current versions
        fileVersionRepository.demoteCurrentVersions(fileId);

        FileVersion newVersion = FileVersion.builder()
                .fileMetadata(file)
                .versionNumber(newVersionNumber)
                .versionValue(newVersionNumber)
                .storagePath(targetVersion.getStoragePath())
                .sha256(targetVersion.getSha256())
                .size(targetVersion.getSize())
                .uploadedAt(LocalDateTime.now())
                .uploadedBy(username)
                .contentType(targetVersion.getContentType())
                .category(targetVersion.getCategory())
                .confidence(targetVersion.getConfidence())
                .tags(targetVersion.getTags())
                .changeDescription("Restored from version " + targetVersion.getVersionNumber())
                .restoredFromVersion(targetVersion.getVersionNumber())
                .currentVersion(true)
                .build();

        newVersion = fileVersionRepository.save(newVersion);

        // Update FileMetadata to restored version's properties
        file.setStoragePath(targetVersion.getStoragePath());
        file.setSha256(targetVersion.getSha256());
        file.setSize(targetVersion.getSize());
        file.setContentType(targetVersion.getContentType());
        file.setCategory(targetVersion.getCategory());
        file.setConfidenceScore(targetVersion.getConfidence());
        file.setVersionValue(newVersionNumber);
        fileRepository.save(file);

        uploadAuditService.logEvent(null, username, "VERSION_RESTORED", "SUCCESS",
                "FileId: " + fileId + ", RestoredVersion: " + targetVersion.getVersionNumber() + ", NewVersion: " + newVersionNumber, null);

        auditService.logEvent(file.getWorkspace() != null ? file.getWorkspace().getId() : null,
            user.getId(), username, com.cloudstorage.backend.entity.AuditEventType.VERSION_RESTORED,
            com.cloudstorage.backend.entity.EntityType.VERSION, newVersion.getId(),
            "Restored version " + targetVersion.getVersionNumber() + " as version " + newVersionNumber + " for file " + file.getFilename(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());

        return newVersion;
    }

    @Override
    @Transactional
    public void deleteVersion(String username, Long fileId, Long versionId) {
        User user = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        authorizationService.checkFilePermission(username, fileId, "DELETE");

        FileVersion version = fileVersionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        if (!version.getFileMetadata().getId().equals(fileId)) {
            throw new RuntimeException("Version does not belong to the requested file");
        }

        boolean wasCurrent = version.isCurrentVersion();
        String sha256 = version.getSha256();
        String storagePath = version.getStoragePath();

        // Delete the version record
        fileVersionRepository.delete(version);

        // Promotion logic if deleted version was current
        if (wasCurrent) {
            List<FileVersion> remainingVersions = fileVersionRepository.findByFileMetadataOrderByVersionNumberDesc(file);
            if (!remainingVersions.isEmpty()) {
                FileVersion newCurrent = remainingVersions.get(0);
                newCurrent.setCurrentVersion(true);
                fileVersionRepository.save(newCurrent);

                // Update FileMetadata
                file.setStoragePath(newCurrent.getStoragePath());
                file.setSha256(newCurrent.getSha256());
                file.setSize(newCurrent.getSize());
                file.setContentType(newCurrent.getContentType());
                file.setCategory(newCurrent.getCategory());
                file.setConfidenceScore(newCurrent.getConfidence());
                file.setVersionValue(newCurrent.getVersionNumber());
                fileRepository.save(file);
            } else {
                // No remaining versions: delete FileMetadata as well
                fileRepository.delete(file);
            }
        }

        // Deduplication safe physical cleanup
        long fileVersionReferences = fileVersionRepository.countBySha256(sha256);
        long fileMetadataReferences = fileRepository.findAll().stream()
                .filter(f -> sha256.equals(f.getSha256()))
                .count();

        if (fileVersionReferences == 0 && fileMetadataReferences == 0) {
            try {
                objectStorageService.deleteFile(storagePath);
            } catch (Exception e) {
                System.err.println("Failed to delete version file from storage: " + e.getMessage());
            }
        }

        uploadAuditService.logEvent(null, username, "VERSION_DELETED", "SUCCESS",
                "FileId: " + fileId + ", VersionId: " + versionId + ", Version: " + version.getVersionNumber(), null);

        auditService.logEvent(file.getWorkspace() != null ? file.getWorkspace().getId() : null,
            user.getId(), username, com.cloudstorage.backend.entity.AuditEventType.VERSION_DELETED,
            com.cloudstorage.backend.entity.EntityType.VERSION, versionId,
            "Deleted version " + version.getVersionNumber() + " of file " + file.getFilename(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
    }

    @Override
    @Transactional(readOnly = true)
    public FileVersion getCurrentVersion(String username, Long fileId) {
        User user = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        authorizationService.checkFilePermission(username, fileId, "READ");

        List<FileVersion> versions = fileVersionRepository.findByFileMetadataOrderByVersionNumberDesc(file);
        if (versions.isEmpty()) {
            throw new RuntimeException("No versions found for this file");
        }

        return versions.stream()
                .filter(FileVersion::isCurrentVersion)
                .findFirst()
                .orElse(versions.get(0));
    }

    @Override
    @Transactional
    public InputStream downloadVersion(String username, Long fileId, Long versionId) {
        User user = getUser(username);
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        authorizationService.checkFilePermission(username, fileId, "DOWNLOAD");

        FileVersion version = fileVersionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Version not found"));

        if (!version.getFileMetadata().getId().equals(fileId)) {
            throw new RuntimeException("Version does not belong to the requested file");
        }

        uploadAuditService.logEvent(null, username, "VERSION_DOWNLOADED", "SUCCESS",
                "FileId: " + fileId + ", VersionId: " + versionId + ", Version: " + version.getVersionNumber(), null);

        return objectStorageService.downloadFile(version.getStoragePath());
    }
}
