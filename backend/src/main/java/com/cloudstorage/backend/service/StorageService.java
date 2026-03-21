package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.Folder;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.FolderRepository;
import com.cloudstorage.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
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
    private final MinioService minioService;
    private final PlatformTransactionManager transactionManager;

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<StorageDto.Item> listItems(String username, Long folderId) {
        User user = getUser(username);
        Folder parentFolder = null;
        if (folderId != null) {
            parentFolder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
            if (!parentFolder.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Access denied");
            }
        }

        List<Folder> folders = (folderId == null)
                ? folderRepository.findByUserAndParentFolderIsNull(user)
                : folderRepository.findByUserAndParentFolder(user, parentFolder);

        List<FileMetadata> files = (folderId == null)
                ? fileRepository.findByUserAndFolderIsNull(user)
                : fileRepository.findByUserAndFolder(user, parentFolder);

        List<StorageDto.Item> items = new ArrayList<>();

        items.addAll(folders.stream().map(f -> StorageDto.Item.builder()
                .id(f.getId())
                .name(f.getName())
                .type("FOLDER")
                .build()).collect(Collectors.toList()));

        items.addAll(files.stream().map(f -> StorageDto.Item.builder()
                .id(f.getId())
                .name(f.getFilename())
                .type("FILE")
                .size(f.getSize())
                .createdDate(f.getUploadDate())
                .build()).collect(Collectors.toList()));

        return items;
    }

    @Transactional
    public void createFolder(String username, String folderName, Long parentId) {
        User user = getUser(username);
        Folder parent = null;
        if (parentId != null) {
            parent = folderRepository.findById(parentId).orElseThrow();
            // check ownership
        }

        Folder folder = new Folder();
        folder.setName(folderName);
        folder.setUser(user);
        folder.setParentFolder(parent);
        folderRepository.save(folder);
    }

    // Removed @Transactional to prevent network I/O blocking DB connection
    public void uploadFile(String username, MultipartFile file, Long folderId) {
        User user = getUser(username);
        Folder parent = null;
        if (folderId != null) {
            parent = folderRepository.findById(folderId).orElseThrow(() -> new RuntimeException("Folder not found"));
        }

        // 1. Upload to Storage (Network I/O) - Done outside of DB Transaction
        String objectName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        try {
            minioService.uploadFile(objectName, file);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to storage", e);
        }

        // 2. Save Metadata (DB Transaction) - Short, focused transaction
        try {
            Folder finalParent = parent;
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                FileMetadata metadata = new FileMetadata();
                metadata.setFilename(file.getOriginalFilename());
                metadata.setSize(file.getSize());
                metadata.setContentType(file.getContentType());
                metadata.setStoragePath(objectName);
                metadata.setUser(user);
                metadata.setFolder(finalParent);
                fileRepository.save(metadata);
            });
        } catch (Exception e) {
            // 3. Compensation: Delete file from storage if DB save fails
            try {
                minioService.deleteFile(objectName);
            } catch (Exception deleteEx) {
                // In production, log this critical failure (orphan file)
                System.err
                        .println("CRITICAL: Failed to delete orphan file " + objectName + ": " + deleteEx.getMessage());
            }
            throw new RuntimeException("Failed to save file metadata. Upload rolled back.", e);
        }
    }

    public InputStream downloadFile(String username, Long fileId) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow();
        // check ownership
        if (!file.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }
        return minioService.getFile(file.getStoragePath());
    }

    public InputStream downloadFileInternal(Long fileId) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow(() -> new RuntimeException("File not found"));
        return minioService.getFile(file.getStoragePath());
    }

    public FileMetadata getFileMetadata(Long fileId) {
        return fileRepository.findById(fileId).orElseThrow();
    }
}
