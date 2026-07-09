package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.repository.*;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@RequiredArgsConstructor
public class StorageService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final SharedFileRepository sharedFileRepository;
    private final ObjectStorageService minioService;
    private final ClassificationService classificationService;
    private final PlatformTransactionManager transactionManager;
    private final FileVersionService fileVersionService;
    private final FileVersionRepository fileVersionRepository;
    private final OcrProcessingService ocrProcessingService;
    
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceService workspaceService;
    private final WorkspaceQuotaService workspaceQuotaService;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Workspace resolveWorkspace(String username) {
        Long contextWsId = WorkspaceContextHolder.getCurrentWorkspaceId();
        if (contextWsId != null) {
            return workspaceRepository.findById(contextWsId)
                    .orElseGet(() -> workspaceService.getOrCreatePersonalWorkspace(username));
        }
        return workspaceService.getOrCreatePersonalWorkspace(username);
    }

    @Transactional(readOnly = true)
    public List<StorageDto.Item> listItems(String username, Long folderId) {
        Workspace workspace;
        Folder parentFolder = null;
        if (folderId != null) {
            parentFolder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
            authorizationService.checkFolderPermission(username, folderId, "READ");
            workspace = parentFolder.getWorkspace();
        } else {
            workspace = resolveWorkspace(username);
            authorizationService.checkWorkspacePermission(username, workspace.getId(), "READ");
        }

        List<Folder> folders = (parentFolder == null)
                ? folderRepository.findByWorkspaceAndParentFolderIsNullAndDeletedFalse(workspace)
                : folderRepository.findByWorkspaceAndParentFolderAndDeletedFalse(workspace, parentFolder);

        List<FileMetadata> files = (parentFolder == null)
                ? fileRepository.findByWorkspaceAndFolderIsNullAndDeletedFalse(workspace)
                : fileRepository.findByWorkspaceAndFolderAndDeletedFalse(workspace, parentFolder);

        List<StorageDto.Item> items = new ArrayList<>();

        items.addAll(folders.stream().map(f -> StorageDto.Item.builder()
                .id(f.getId())
                .name(f.getName())
                .type("FOLDER")
                .starred(false)
                .build()).collect(Collectors.toList()));

        items.addAll(files.stream().map(f -> StorageDto.Item.builder()
                .id(f.getId())
                .name(f.getFilename())
                .type("FILE")
                .size(f.getSize())
                .createdDate(f.getUploadDate())
                .starred(f.isStarred())
                .category(f.getCategory())
                .confidenceScore(f.getConfidenceScore())
                .tags(f.getTags())
                .versionValue(f.getVersionValue())
                .classification(f.getClassification())
                .build()).collect(Collectors.toList()));

        return items;
    }

    @Transactional
    public void createFolder(String username, String folderName, Long parentId) {
        User user = getUser(username);
        Folder parent = null;
        Workspace workspace;
        if (parentId != null) {
            parent = folderRepository.findById(parentId).orElseThrow();
            authorizationService.checkFolderPermission(username, parentId, "WRITE");
            workspace = parent.getWorkspace();
        } else {
            workspace = resolveWorkspace(username);
            authorizationService.checkWorkspacePermission(username, workspace.getId(), "WRITE");
        }

        Folder folder = new Folder();
        folder.setName(folderName);
        folder.setUser(user);
        folder.setParentFolder(parent);
        folder.setWorkspace(workspace);
        folder = folderRepository.save(folder);

        auditService.logEvent(workspace.getId(), user.getId(), user.getUsername(), 
            com.cloudstorage.backend.entity.AuditEventType.FOLDER_CREATED, 
            com.cloudstorage.backend.entity.EntityType.FOLDER, folder.getId(), 
            "Created folder: " + folderName, "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
    }

    private String calculateSha256(MultipartFile file) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(file.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Could not calculate SHA-256 hash", e);
        }
    }

    public void uploadFile(String username, MultipartFile file, Long folderId) {
        User user = getUser(username);
        Folder parent = null;
        Workspace workspace;
        if (folderId != null) {
            parent = folderRepository.findById(folderId).orElseThrow(() -> new RuntimeException("Folder not found"));
            authorizationService.checkFolderPermission(username, folderId, "WRITE");
            workspace = parent.getWorkspace();
        } else {
            workspace = resolveWorkspace(username);
            authorizationService.checkWorkspacePermission(username, workspace.getId(), "WRITE");
        }

        workspaceQuotaService.validateUploadQuota(workspace.getId(), file.getSize());

        String sha256 = calculateSha256(file);
        java.util.Optional<FileMetadata> existingFile = fileRepository.findFirstBySha256AndDeletedFalse(sha256);
        String objectName;
        boolean isDuplicate = false;

        if (existingFile.isPresent() && minioService.objectExists(existingFile.get().getStoragePath())) {
            // True deduplication: reuse existing MinIO object
            objectName = existingFile.get().getStoragePath();
            isDuplicate = true;
        } else {
            // Either no duplicate or the MinIO object is missing (e.g. after bucket reset) - upload fresh
            objectName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            try {
                minioService.uploadFile(objectName, file.getInputStream(), file.getSize(), file.getContentType());
            } catch (Exception e) {
                throw new RuntimeException("Failed to upload file to storage", e);
            }
        }


        String category = classificationService.classifyFile(file.getOriginalFilename(), file.getContentType());
        double confidence = 0.90;

        try {
            Folder finalParent = parent;
            String finalObjectName = objectName;
            Workspace finalWorkspace = workspace;

            java.util.concurrent.locks.ReentrantLock fileLock = fileVersionService.getFileLock(
                    user.getUsername(),
                    finalParent != null ? finalParent.getId() : null,
                    file.getOriginalFilename()
            );
            fileLock.lock();
            Long[] savedFileId = new Long[1];
            try {
                new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                    Optional<FileMetadata> existingFileOpt;
                    if (finalParent == null) {
                        existingFileOpt = fileRepository.findByUserAndFilenameAndFolderIsNullAndDeletedFalse(user, file.getOriginalFilename());
                    } else {
                        existingFileOpt = fileRepository.findByUserAndFilenameAndFolderAndDeletedFalse(user, file.getOriginalFilename(), finalParent);
                    }

                    FileMetadata metadata;
                    if (existingFileOpt.isPresent()) {
                        metadata = existingFileOpt.get();
                        workspaceQuotaService.incrementStorageUsed(finalWorkspace.getId(), file.getSize());
                        fileVersionService.createNewVersion(
                                metadata,
                                finalObjectName,
                                sha256,
                                file.getSize(),
                                file.getContentType(),
                                category,
                                confidence,
                                metadata.getTags(),
                                "Uploaded new revision",
                                null,
                                user.getUsername(),
                                false
                        );
                    } else {
                        metadata = new FileMetadata();
                        metadata.setFilename(file.getOriginalFilename());
                        metadata.setSize(file.getSize());
                        metadata.setContentType(file.getContentType());
                        metadata.setStoragePath(finalObjectName);
                        metadata.setUser(user);
                        metadata.setFolder(finalParent);
                        metadata.setWorkspace(finalWorkspace);
                        metadata.setSha256(sha256);
                        metadata.setCategory(category);
                        metadata.setConfidenceScore(confidence);
                        metadata.setStarred(false);
                        metadata.setDeleted(false);
                        metadata = fileRepository.save(metadata);

                        workspaceQuotaService.incrementStorageUsed(finalWorkspace.getId(), file.getSize());
                        fileVersionService.createNewVersion(
                                metadata,
                                finalObjectName,
                                sha256,
                                file.getSize(),
                                file.getContentType(),
                                metadata.getCategory(),
                                metadata.getConfidenceScore(),
                                metadata.getTags(),
                                "Initial upload",
                                null,
                                user.getUsername(),
                                true
                        );
                    }
                    savedFileId[0] = metadata.getId();
                });

                if (savedFileId[0] != null) {
                    ocrProcessingService.queueOcrJob(savedFileId[0]);
                }
            } finally {
                fileLock.unlock();
            }
        } catch (Exception e) {
            if (!isDuplicate) {
                try {
                    minioService.deleteFile(objectName);
                } catch (Exception deleteEx) {
                    System.err.println("CRITICAL: Failed to delete orphan file " + objectName + ": " + deleteEx.getMessage());
                }
            }
            throw new RuntimeException("Failed to save file metadata. Upload rolled back.", e);
        }
    }

    @Transactional(readOnly = true)
    public InputStream downloadFile(String username, Long fileId) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow();
        authorizationService.checkFilePermission(username, fileId, "READ");
        return minioService.downloadFile(file.getStoragePath());
    }

    public InputStream downloadFileInternal(Long fileId) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow(() -> new RuntimeException("File not found"));
        return minioService.downloadFile(file.getStoragePath());
    }

    public FileMetadata getFileMetadata(Long fileId) {
        return fileRepository.findById(fileId).orElseThrow();
    }

    @Transactional
    public void softDelete(String username, Long id, boolean isFolder) {
        User user = getUser(username);
        if (isFolder) {
            Folder folder = folderRepository.findById(id).orElseThrow();
            authorizationService.checkFolderPermission(username, id, "WRITE");
            softDeleteFolderRecursive(folder);
        } else {
            FileMetadata file = fileRepository.findById(id).orElseThrow();
            authorizationService.checkFilePermission(username, id, "WRITE");
            file.setDeleted(true);
            file.setDeletedAt(LocalDateTime.now());
            fileRepository.save(file);
            if (file.getWorkspace() != null) {
                workspaceQuotaService.decrementStorageUsed(file.getWorkspace().getId(), file.getSize());
            }
            auditService.logEvent(file.getWorkspace() != null ? file.getWorkspace().getId() : null, user.getId(), user.getUsername(), 
                com.cloudstorage.backend.entity.AuditEventType.FILE_DELETED, 
                com.cloudstorage.backend.entity.EntityType.FILE, file.getId(), 
                "Soft deleted file: " + file.getFilename(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
        }
    }

    private void softDeleteFolderRecursive(Folder folder) {
        folder.setDeleted(true);
        folder.setDeletedAt(LocalDateTime.now());
        folderRepository.save(folder);
        List<Folder> subfolders = folderRepository.findByWorkspaceAndParentFolderAndDeletedFalse(folder.getWorkspace(), folder);
        for (Folder sub : subfolders) {
            softDeleteFolderRecursive(sub);
        }
        List<FileMetadata> files = fileRepository.findByWorkspaceAndFolderAndDeletedFalse(folder.getWorkspace(), folder);
        for (FileMetadata f : files) {
            f.setDeleted(true);
            f.setDeletedAt(LocalDateTime.now());
            fileRepository.save(f);
            if (f.getWorkspace() != null) {
                workspaceQuotaService.decrementStorageUsed(f.getWorkspace().getId(), f.getSize());
            }
        }
    }

    @Transactional
    public void restore(String username, Long id, boolean isFolder) {
        User user = getUser(username);
        if (isFolder) {
            Folder folder = folderRepository.findById(id).orElseThrow();
            authorizationService.checkFolderPermission(username, id, "WRITE");
            restoreFolderRecursive(folder);
        } else {
            FileMetadata file = fileRepository.findById(id).orElseThrow();
            authorizationService.checkFilePermission(username, id, "WRITE");
            
            if (file.getWorkspace() != null) {
                workspaceQuotaService.validateUploadQuota(file.getWorkspace().getId(), file.getSize());
                workspaceQuotaService.incrementStorageUsed(file.getWorkspace().getId(), file.getSize());
            }
            
            file.setDeleted(false);
            file.setDeletedAt(null);
            fileRepository.save(file);

            auditService.logEvent(file.getWorkspace() != null ? file.getWorkspace().getId() : null, user.getId(), user.getUsername(), 
                com.cloudstorage.backend.entity.AuditEventType.FILE_RESTORED, 
                com.cloudstorage.backend.entity.EntityType.FILE, file.getId(), 
                "Restored file: " + file.getFilename(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
        }
    }

    private void restoreFolderRecursive(Folder folder) {
        folder.setDeleted(false);
        folder.setDeletedAt(null);
        folderRepository.save(folder);
        List<Folder> subfolders = folderRepository.findByWorkspaceAndDeletedTrue(folder.getWorkspace());
        for (Folder sub : subfolders) {
            if (sub.getParentFolder() != null && sub.getParentFolder().getId().equals(folder.getId())) {
                restoreFolderRecursive(sub);
            }
        }
        List<FileMetadata> files = fileRepository.findByWorkspaceAndDeletedTrue(folder.getWorkspace());
        for (FileMetadata f : files) {
            if (f.getFolder() != null && f.getFolder().getId().equals(folder.getId())) {
                if (f.getWorkspace() != null) {
                    workspaceQuotaService.incrementStorageUsed(f.getWorkspace().getId(), f.getSize());
                }
                f.setDeleted(false);
                f.setDeletedAt(null);
                fileRepository.save(f);
            }
        }
    }

    @Transactional
    public void permanentDelete(String username, Long id, boolean isFolder) {
        User user = getUser(username);
        if (isFolder) {
            Folder folder = folderRepository.findById(id).orElseThrow();
            authorizationService.checkFolderPermission(username, id, "WRITE");
            permanentDeleteFolderRecursive(folder);
        } else {
            FileMetadata file = fileRepository.findById(id).orElseThrow();
            authorizationService.checkFilePermission(username, id, "WRITE");
            
            List<SharedFile> shares = sharedFileRepository.findAll().stream()
                    .filter(sf -> sf.getFile().getId().equals(file.getId()))
                    .collect(Collectors.toList());
            sharedFileRepository.deleteAll(shares);

            List<FileVersion> versions = fileVersionRepository.findByFileMetadataOrderByVersionNumberDesc(file);
            for (FileVersion version : versions) {
                String sha256 = version.getSha256();
                long fileVersionRefs = fileVersionRepository.findAll().stream()
                        .filter(v -> !v.getFileMetadata().getId().equals(file.getId()) && sha256.equals(v.getSha256()))
                        .count();
                long fileMetadataRefs = fileRepository.findAll().stream()
                        .filter(other -> !other.getId().equals(file.getId()) && sha256.equals(other.getSha256()))
                        .count();
                if (fileVersionRefs == 0 && fileMetadataRefs == 0) {
                    try {
                        minioService.deleteFile(version.getStoragePath());
                    } catch (Exception e) {
                        System.err.println("Failed to delete from MinIO: " + e.getMessage());
                    }
                }
                fileVersionRepository.delete(version);
            }

            if (versions.isEmpty()) {
                String sha256 = file.getSha256();
                boolean referenced = false;
                if (sha256 != null) {
                    long count = fileRepository.findAll().stream()
                            .filter(f -> !f.getId().equals(file.getId()) && sha256.equals(f.getSha256()))
                            .count();
                    if (count > 0) referenced = true;
                }
                if (!referenced) {
                    try {
                        minioService.deleteFile(file.getStoragePath());
                    } catch (Exception e) {
                        System.err.println("Failed to delete from MinIO: " + e.getMessage());
                    }
                }
            }

            fileRepository.delete(file);

            auditService.logEvent(file.getWorkspace() != null ? file.getWorkspace().getId() : null, user.getId(), user.getUsername(), 
                com.cloudstorage.backend.entity.AuditEventType.FILE_DELETED, 
                com.cloudstorage.backend.entity.EntityType.FILE, file.getId(), 
                "Permanently deleted file: " + file.getFilename(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
        }
    }

    private void permanentDeleteFolderRecursive(Folder folder) {
        List<Folder> subfolders = folderRepository.findByWorkspaceAndDeletedTrue(folder.getWorkspace()).stream()
                .filter(f -> f.getParentFolder() != null && f.getParentFolder().getId().equals(folder.getId()))
                .collect(Collectors.toList());
        for (Folder sub : subfolders) {
            permanentDeleteFolderRecursive(sub);
        }
        List<FileMetadata> files = fileRepository.findByWorkspaceAndDeletedTrue(folder.getWorkspace()).stream()
                .filter(f -> f.getFolder() != null && f.getFolder().getId().equals(folder.getId()))
                .collect(Collectors.toList());
        for (FileMetadata f : files) {
            List<SharedFile> shares = sharedFileRepository.findAll().stream()
                    .filter(sf -> sf.getFile().getId().equals(f.getId()))
                    .collect(Collectors.toList());
            sharedFileRepository.deleteAll(shares);

            List<FileVersion> versions = fileVersionRepository.findByFileMetadataOrderByVersionNumberDesc(f);
            for (FileVersion version : versions) {
                String sha256 = version.getSha256();
                long fileVersionRefs = fileVersionRepository.findAll().stream()
                        .filter(v -> !v.getFileMetadata().getId().equals(f.getId()) && sha256.equals(v.getSha256()))
                        .count();
                long fileMetadataRefs = fileRepository.findAll().stream()
                        .filter(other -> !other.getId().equals(f.getId()) && sha256.equals(other.getSha256()))
                        .count();
                if (fileVersionRefs == 0 && fileMetadataRefs == 0) {
                    try {
                        minioService.deleteFile(version.getStoragePath());
                    } catch (Exception e) {
                        System.err.println("Failed to delete from MinIO during recursive delete: " + e.getMessage());
                    }
                }
                fileVersionRepository.delete(version);
            }

            if (versions.isEmpty()) {
                String sha256 = f.getSha256();
                boolean referenced = false;
                if (sha256 != null) {
                    long count = fileRepository.findAll().stream()
                            .filter(other -> !other.getId().equals(f.getId()) && sha256.equals(other.getSha256()))
                            .count();
                    if (count > 0) referenced = true;
                }
                if (!referenced) {
                    try {
                        minioService.deleteFile(f.getStoragePath());
                    } catch (Exception e) {
                        System.err.println("Failed to delete from MinIO during recursive delete: " + e.getMessage());
                    }
                }
            }

            fileRepository.delete(f);
        }
        folderRepository.delete(folder);
    }

    @Transactional
    public void rename(String username, Long id, boolean isFolder, String newName) {
        if (newName == null || newName.trim().isEmpty()) {
            throw new RuntimeException("Rename value cannot be empty");
        }
        User user = getUser(username);
        if (isFolder) {
            Folder folder = folderRepository.findById(id).orElseThrow(() -> new RuntimeException("Folder not found"));
            authorizationService.checkFolderPermission(username, id, "WRITE");
            if (folder.isDeleted()) throw new RuntimeException("Cannot rename a deleted folder");
            folder.setName(newName);
            folderRepository.save(folder);
        } else {
            FileMetadata file = fileRepository.findById(id).orElseThrow(() -> new RuntimeException("File not found"));
            authorizationService.checkFilePermission(username, id, "WRITE");
            if (file.isDeleted()) throw new RuntimeException("Cannot rename a deleted file");
            file.setFilename(newName);
            fileRepository.save(file);

            auditService.logEvent(file.getWorkspace() != null ? file.getWorkspace().getId() : null, user.getId(), user.getUsername(), 
                com.cloudstorage.backend.entity.AuditEventType.FILE_MODIFIED, 
                com.cloudstorage.backend.entity.EntityType.FILE, file.getId(), 
                "Renamed file to: " + newName, "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
        }
    }

    @Transactional
    public void copy(String username, Long id, boolean isFolder, Long targetFolderId) {
        User user = getUser(username);
        Folder targetFolder = null;
        if (targetFolderId != null) {
            targetFolder = folderRepository.findById(targetFolderId).orElseThrow();
            authorizationService.checkFolderPermission(username, targetFolderId, "WRITE");
            if (targetFolder.isDeleted()) throw new RuntimeException("Cannot copy into a deleted folder");
        }
        
        Workspace targetWorkspace = targetFolder != null ? targetFolder.getWorkspace() : resolveWorkspace(username);
        
        if (isFolder) {
            Folder folder = folderRepository.findById(id).orElseThrow();
            authorizationService.checkFolderPermission(username, id, "READ");
            if (folder.isDeleted()) throw new RuntimeException("Cannot copy a deleted folder");
            copyFolderRecursive(folder, targetFolder, targetWorkspace);
        } else {
            FileMetadata file = fileRepository.findById(id).orElseThrow();
            authorizationService.checkFilePermission(username, id, "READ");
            if (file.isDeleted()) throw new RuntimeException("Cannot copy a deleted file");
            
            workspaceQuotaService.validateUploadQuota(targetWorkspace.getId(), file.getSize());
            copyFile(file, targetFolder, targetWorkspace);
            workspaceQuotaService.incrementStorageUsed(targetWorkspace.getId(), file.getSize());
        }
    }

    private void copyFile(FileMetadata file, Folder targetFolder, Workspace targetWorkspace) {
        FileMetadata copied = new FileMetadata();
        copied.setFilename("Copy of " + file.getFilename());
        copied.setSize(file.getSize());
        copied.setContentType(file.getContentType());
        copied.setStoragePath(file.getStoragePath());
        copied.setUser(file.getUser());
        copied.setFolder(targetFolder);
        copied.setWorkspace(targetWorkspace);
        copied.setSha256(file.getSha256());
        copied.setCategory(file.getCategory());
        copied.setConfidenceScore(file.getConfidenceScore());
        copied.setTags(file.getTags());
        copied.setClassification(file.getClassification());
        fileRepository.save(copied);
    }

    private void copyFolderRecursive(Folder folder, Folder targetParent, Workspace targetWorkspace) {
        Folder copy = new Folder();
        copy.setName("Copy of " + folder.getName());
        copy.setUser(folder.getUser());
        copy.setParentFolder(targetParent);
        copy.setWorkspace(targetWorkspace);
        copy = folderRepository.save(copy);
        List<Folder> subfolders = folderRepository.findByWorkspaceAndParentFolderAndDeletedFalse(folder.getWorkspace(), folder);
        for (Folder sub : subfolders) {
            copyFolderRecursive(sub, copy, targetWorkspace);
        }
        List<FileMetadata> files = fileRepository.findByWorkspaceAndFolderAndDeletedFalse(folder.getWorkspace(), folder);
        for (FileMetadata f : files) {
            workspaceQuotaService.validateUploadQuota(targetWorkspace.getId(), f.getSize());
            copyFile(f, copy, targetWorkspace);
            workspaceQuotaService.incrementStorageUsed(targetWorkspace.getId(), f.getSize());
        }
    }

    @Transactional
    public void move(String username, Long id, boolean isFolder, Long targetFolderId) {
        User user = getUser(username);
        Folder targetFolder = null;
        if (targetFolderId != null) {
            targetFolder = folderRepository.findById(targetFolderId).orElseThrow(() -> new RuntimeException("Folder not found"));
            authorizationService.checkFolderPermission(username, targetFolderId, "WRITE");
            if (targetFolder.isDeleted()) throw new RuntimeException("Cannot move into a deleted folder");
        }
        
        Workspace targetWorkspace = targetFolder != null ? targetFolder.getWorkspace() : resolveWorkspace(username);

        if (isFolder) {
            Folder folder = folderRepository.findById(id).orElseThrow(() -> new RuntimeException("Folder not found"));
            authorizationService.checkFolderPermission(username, id, "WRITE");
            if (folder.isDeleted()) throw new RuntimeException("Cannot move a deleted folder");
            
            Folder targetParent = targetFolder;
            while (targetParent != null) {
                if (targetParent.getId().equals(folder.getId())) {
                    throw new RuntimeException("Cannot move a folder into itself or its sub-folder");
                }
                targetParent = targetParent.getParentFolder();
            }

            // If moving folder to a different workspace, update all sub-folders and sub-files workspace references and check/move quota!
            Workspace sourceWorkspace = folder.getWorkspace();
            if (sourceWorkspace != null && targetWorkspace != null && !sourceWorkspace.getId().equals(targetWorkspace.getId())) {
                moveFolderWorkspaceRecursive(folder, sourceWorkspace, targetWorkspace);
            }

            folder.setParentFolder(targetFolder);
            folder.setWorkspace(targetWorkspace);
            folderRepository.save(folder);
        } else {
            FileMetadata file = fileRepository.findById(id).orElseThrow(() -> new RuntimeException("File not found"));
            authorizationService.checkFilePermission(username, id, "WRITE");
            if (file.isDeleted()) throw new RuntimeException("Cannot move a deleted file");
            
            Workspace sourceWorkspace = file.getWorkspace();
            if (sourceWorkspace != null && targetWorkspace != null && !sourceWorkspace.getId().equals(targetWorkspace.getId())) {
                workspaceQuotaService.validateUploadQuota(targetWorkspace.getId(), file.getSize());
                workspaceQuotaService.incrementStorageUsed(targetWorkspace.getId(), file.getSize());
                workspaceQuotaService.decrementStorageUsed(sourceWorkspace.getId(), file.getSize());
            }

            file.setFolder(targetFolder);
            file.setWorkspace(targetWorkspace);
            fileRepository.save(file);
        }
    }

    private void moveFolderWorkspaceRecursive(Folder folder, Workspace source, Workspace target) {
        List<Folder> subfolders = folderRepository.findByWorkspaceAndParentFolderAndDeletedFalse(source, folder);
        for (Folder sub : subfolders) {
            sub.setWorkspace(target);
            folderRepository.save(sub);
            moveFolderWorkspaceRecursive(sub, source, target);
        }
        List<FileMetadata> files = fileRepository.findByWorkspaceAndFolderAndDeletedFalse(source, folder);
        for (FileMetadata f : files) {
            workspaceQuotaService.validateUploadQuota(target.getId(), f.getSize());
            workspaceQuotaService.incrementStorageUsed(target.getId(), f.getSize());
            workspaceQuotaService.decrementStorageUsed(source.getId(), f.getSize());
            f.setWorkspace(target);
            fileRepository.save(f);
        }
    }

    @Transactional
    public void toggleStar(String username, Long fileId) {
        User user = getUser(username);
        FileMetadata file = fileRepository.findById(fileId).orElseThrow();
        authorizationService.checkFilePermission(username, fileId, "WRITE");
        if (file.isDeleted()) throw new RuntimeException("Cannot star a deleted file");
        file.setStarred(!file.isStarred());
        fileRepository.save(file);
    }

    @Transactional(readOnly = true)
    public List<StorageDto.Item> listStarredItems(String username) {
        Workspace workspace = resolveWorkspace(username);
        authorizationService.checkWorkspacePermission(username, workspace.getId(), "READ");
        List<FileMetadata> files = fileRepository.findByWorkspaceAndStarredTrueAndDeletedFalse(workspace);
        return files.stream().map(f -> StorageDto.Item.builder()
                .id(f.getId())
                .name(f.getFilename())
                .type("FILE")
                .size(f.getSize())
                .createdDate(f.getUploadDate())
                .starred(true)
                .category(f.getCategory())
                .tags(f.getTags())
                .classification(f.getClassification())
                .build()).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StorageDto.Item> listTrashItems(String username) {
        Workspace workspace = resolveWorkspace(username);
        authorizationService.checkWorkspacePermission(username, workspace.getId(), "READ");
        List<Folder> folders = folderRepository.findByWorkspaceAndDeletedTrue(workspace);
        List<FileMetadata> files = fileRepository.findByWorkspaceAndDeletedTrue(workspace);
        List<StorageDto.Item> items = new ArrayList<>();
        items.addAll(folders.stream().map(f -> StorageDto.Item.builder()
                .id(f.getId())
                .name(f.getName())
                .type("FOLDER")
                .createdDate(f.getDeletedAt())
                .starred(false)
                .build()).collect(Collectors.toList()));
        items.addAll(files.stream().map(f -> StorageDto.Item.builder()
                .id(f.getId())
                .name(f.getFilename())
                .type("FILE")
                .size(f.getSize())
                .createdDate(f.getDeletedAt())
                .starred(f.isStarred())
                .category(f.getCategory())
                .build()).collect(Collectors.toList()));
        return items;
    }

    @Transactional
    public void updateTags(String username, Long fileId, String tags) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow();
        authorizationService.checkFilePermission(username, fileId, "WRITE");
        file.setTags(tags);
        fileRepository.save(file);
    }

    @Transactional
    public void updateCategory(String username, Long fileId, String category) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow();
        authorizationService.checkFilePermission(username, fileId, "WRITE");
        file.setCategory(category);
        file.setConfidenceScore(1.0);
        fileRepository.save(file);
    }

    @Transactional
    public void updateClassification(String username, Long fileId, String classification) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow();
        authorizationService.checkFilePermission(username, fileId, "WRITE");
        file.setClassification(classification);
        fileRepository.save(file);
    }

    @Transactional(readOnly = true)
    public StorageDto.Analytics getAnalytics(String username) {
        Workspace workspace = resolveWorkspace(username);
        authorizationService.checkWorkspacePermission(username, workspace.getId(), "READ");
        
        List<FileMetadata> activeFiles = fileRepository.findAll().stream()
                .filter(f -> f.getWorkspace() != null && f.getWorkspace().getId().equals(workspace.getId()) && !f.isDeleted())
                .collect(Collectors.toList());

        long fileCount = activeFiles.size();
        long storageUsage = activeFiles.stream().mapToLong(FileMetadata::getSize).sum();

        long duplicateSavings = activeFiles.stream()
                .filter(f -> f.getSha256() != null && !f.getSha256().isEmpty())
                .collect(Collectors.groupingBy(FileMetadata::getSha256))
                .values().stream()
                .mapToLong(group -> {
                    if (group.size() <= 1) return 0L;
                    long size = group.get(0).getSize();
                    return (group.size() - 1) * size;
                })
                .sum();

        long starredCount = activeFiles.stream().filter(FileMetadata::isStarred).count();

        long trashFilesCount = fileRepository.findByWorkspaceAndDeletedTrue(workspace).size();
        long trashFoldersCount = folderRepository.findByWorkspaceAndDeletedTrue(workspace).size();
        long trashCount = trashFilesCount + trashFoldersCount;

        return StorageDto.Analytics.builder()
                .storageUsage(storageUsage)
                .fileCount(fileCount)
                .duplicateSavings(duplicateSavings)
                .starredCount(starredCount)
                .trashCount(trashCount)
                .build();
    }
}
