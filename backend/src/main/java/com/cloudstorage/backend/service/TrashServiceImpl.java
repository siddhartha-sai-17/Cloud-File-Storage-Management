package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.TrashItemDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.Folder;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.FolderRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceRepository;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrashServiceImpl implements TrashService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final StorageService storageService;

    @Override
    @Transactional(readOnly = true)
    public List<TrashItemDto> listTrash(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long contextWsId = WorkspaceContextHolder.getCurrentWorkspaceId();
        List<TrashItemDto> trashItems = new ArrayList<>();

        if (contextWsId != null) {
            Workspace workspace = workspaceRepository.findById(contextWsId).orElse(null);
            if (workspace != null) {
                List<Folder> folders = folderRepository.findByWorkspaceAndDeletedTrue(workspace);
                List<FileMetadata> files = fileRepository.findByWorkspaceAndDeletedTrue(workspace);

                for (Folder f : folders) {
                    trashItems.add(TrashItemDto.builder()
                            .id(f.getId())
                            .name(f.getName())
                            .type("FOLDER")
                            .size(0L)
                            .deletedAt(f.getDeletedAt())
                            .deletedBy(f.getUser() != null ? f.getUser().getUsername() : "Unknown")
                            .build());
                }
                for (FileMetadata f : files) {
                    trashItems.add(TrashItemDto.builder()
                            .id(f.getId())
                            .name(f.getFilename())
                            .type("FILE")
                            .size(f.getSize())
                            .deletedAt(f.getDeletedAt())
                            .deletedBy(f.getUser() != null ? f.getUser().getUsername() : "Unknown")
                            .build());
                }
            }
        } else {
            List<Folder> folders = folderRepository.findByUserAndDeletedTrue(user);
            List<FileMetadata> files = fileRepository.findByUserAndDeletedTrue(user);

            for (Folder f : folders) {
                trashItems.add(TrashItemDto.builder()
                        .id(f.getId())
                        .name(f.getName())
                        .type("FOLDER")
                        .size(0L)
                        .deletedAt(f.getDeletedAt())
                        .deletedBy(user.getUsername())
                        .build());
            }
            for (FileMetadata f : files) {
                trashItems.add(TrashItemDto.builder()
                        .id(f.getId())
                        .name(f.getFilename())
                        .type("FILE")
                        .size(f.getSize())
                        .deletedAt(f.getDeletedAt())
                        .deletedBy(user.getUsername())
                        .build());
            }
        }
        return trashItems;
    }

    @Override
    @Transactional
    public void restoreItem(String username, Long id, boolean isFolder) {
        storageService.restore(username, id, isFolder);
    }

    @Override
    @Transactional
    public void permanentDeleteItem(String username, Long id, boolean isFolder) {
        storageService.permanentDelete(username, id, isFolder);
    }

    @Override
    public void bulkRestore(String username, List<Long> fileIds, List<Long> folderIds) {
        if (folderIds != null) {
            for (Long fid : folderIds) {
                try {
                    storageService.restore(username, fid, true);
                } catch (Exception e) {
                    // Log and continue bulk operation
                }
            }
        }
        if (fileIds != null) {
            for (Long fileId : fileIds) {
                try {
                    storageService.restore(username, fileId, false);
                } catch (Exception e) {
                    // Log and continue bulk operation
                }
            }
        }
    }

    @Override
    public void bulkPermanentDelete(String username, List<Long> fileIds, List<Long> folderIds) {
        if (folderIds != null) {
            for (Long fid : folderIds) {
                try {
                    storageService.permanentDelete(username, fid, true);
                } catch (Exception e) {
                    // Log and continue bulk operation
                }
            }
        }
        if (fileIds != null) {
            for (Long fileId : fileIds) {
                try {
                    storageService.permanentDelete(username, fileId, false);
                } catch (Exception e) {
                    // Log and continue bulk operation
                }
            }
        }
    }

    @Override
    @Transactional
    public void autoCleanup(int retentionDays) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        List<FileMetadata> filesToDelete = fileRepository.findAll().stream()
                .filter(f -> f.isDeleted() && f.getDeletedAt() != null && f.getDeletedAt().isBefore(cutoff))
                .collect(Collectors.toList());

        List<Folder> foldersToDelete = folderRepository.findAll().stream()
                .filter(f -> f.isDeleted() && f.getDeletedAt() != null && f.getDeletedAt().isBefore(cutoff))
                .collect(Collectors.toList());

        for (Folder f : foldersToDelete) {
            try {
                String owner = f.getUser() != null ? f.getUser().getUsername() : "System";
                storageService.permanentDelete(owner, f.getId(), true);
            } catch (Exception e) {
                // Ignore and log
            }
        }

        for (FileMetadata f : filesToDelete) {
            try {
                String owner = f.getUser() != null ? f.getUser().getUsername() : "System";
                storageService.permanentDelete(owner, f.getId(), false);
            } catch (Exception e) {
                // Ignore and log
            }
        }
    }
}
