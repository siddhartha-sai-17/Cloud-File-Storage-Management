package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceRepository;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoritesServiceImpl implements FavoritesService {

    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional
    public void starFile(String username, Long fileId) {
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        authorizationService.checkFilePermission(username, fileId, "WRITE");
        if (file.isDeleted()) {
            throw new RuntimeException("Cannot star a deleted file");
        }
        if (!file.isStarred()) {
            file.setStarred(true);
            fileRepository.save(file);
        }
    }

    @Override
    @Transactional
    public void unstarFile(String username, Long fileId) {
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        authorizationService.checkFilePermission(username, fileId, "WRITE");
        if (file.isStarred()) {
            file.setStarred(false);
            fileRepository.save(file);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StorageDto.Item> listFavorites(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long contextWsId = WorkspaceContextHolder.getCurrentWorkspaceId();

        Specification<FileMetadata> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("starred")));
            predicates.add(cb.isFalse(root.get("deleted")));

            if (contextWsId != null) {
                predicates.add(cb.equal(root.get("workspace").get("id"), contextWsId));
            } else {
                predicates.add(cb.equal(root.get("user").get("username"), username));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<FileMetadata> filePage = fileRepository.findAll(spec, pageable);
        List<StorageDto.Item> items = filePage.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return new PageImpl<>(items, pageable, filePage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getFavoriteStatistics(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long contextWsId = WorkspaceContextHolder.getCurrentWorkspaceId();
        List<FileMetadata> starredFiles;

        if (contextWsId != null) {
            Workspace workspace = workspaceRepository.findById(contextWsId).orElse(null);
            starredFiles = workspace != null ? fileRepository.findByWorkspaceAndStarredTrueAndDeletedFalse(workspace) : new ArrayList<>();
        } else {
            starredFiles = fileRepository.findByUserAndStarredTrueAndDeletedFalse(user);
        }

        long count = starredFiles.size();
        long totalSize = starredFiles.stream().mapToLong(FileMetadata::getSize).sum();

        Map<String, Long> categoryBreakdown = starredFiles.stream()
                .filter(f -> f.getCategory() != null)
                .collect(Collectors.groupingBy(FileMetadata::getCategory, Collectors.counting()));

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalFavorites", count);
        stats.put("totalSize", totalSize);
        stats.put("categoryBreakdown", categoryBreakdown);
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
