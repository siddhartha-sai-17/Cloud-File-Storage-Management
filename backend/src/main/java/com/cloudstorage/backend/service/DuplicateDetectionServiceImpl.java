package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.DuplicateGroupDto;
import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceRepository;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DuplicateDetectionServiceImpl implements DuplicateDetectionService {

    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DuplicateGroupDto> getDuplicateReport(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long contextWsId = WorkspaceContextHolder.getCurrentWorkspaceId();
        List<FileMetadata> files;

        if (contextWsId != null) {
            Workspace workspace = workspaceRepository.findById(contextWsId).orElse(null);
            files = workspace != null ? fileRepository.findAll().stream()
                    .filter(f -> f.getWorkspace() != null && f.getWorkspace().getId().equals(contextWsId) && !f.isDeleted())
                    .collect(Collectors.toList()) : new ArrayList<>();
        } else {
            files = fileRepository.findByUser_UsernameAndDeletedFalse(username);
        }

        // Group by SHA256
        Map<String, List<FileMetadata>> grouped = files.stream()
                .filter(f -> f.getSha256() != null && !f.getSha256().isEmpty())
                .collect(Collectors.groupingBy(FileMetadata::getSha256));

        List<DuplicateGroupDto> report = new ArrayList<>();
        for (Map.Entry<String, List<FileMetadata>> entry : grouped.entrySet()) {
            List<FileMetadata> dups = entry.getValue();
            if (dups.size() > 1) {
                long size = dups.get(0).getSize();
                long savings = size * (dups.size() - 1);
                report.add(DuplicateGroupDto.builder()
                        .sha256(entry.getKey())
                        .fileCount(dups.size())
                        .totalSize(size * dups.size())
                        .potentialSavings(savings)
                        .duplicates(dups.stream().map(this::mapToDto).collect(Collectors.toList()))
                        .build());
            }
        }
        return report;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getStorageSavingStats(String username) {
        List<DuplicateGroupDto> report = getDuplicateReport(username);
        long totalSavings = report.stream().mapToLong(DuplicateGroupDto::getPotentialSavings).sum();
        long duplicateFilesCount = report.stream().mapToInt(g -> g.getFileCount() - 1).sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSavingsBytes", totalSavings);
        stats.put("duplicateFilesCount", duplicateFilesCount);
        stats.put("duplicateGroupsCount", report.size());
        return stats;
    }

    private StorageDto.Item mapToDto(FileMetadata file) {
        return StorageDto.Item.builder()
                .id(file.getId())
                .name(file.getFilename())
                .type("FILE")
                .size(file.getSize())
                .createdDate(file.getUploadDate())
                .starred(file.isStarred())
                .category(file.getCategory())
                .tags(file.getTags())
                .classification(file.getClassification())
                .confidenceScore(file.getConfidenceScore())
                .versionValue(file.getVersionValue())
                .build();
    }
}
