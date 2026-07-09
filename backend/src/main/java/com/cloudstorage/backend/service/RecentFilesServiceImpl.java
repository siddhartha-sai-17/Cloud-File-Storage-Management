package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageDto;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.repository.AuditRepository;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecentFilesServiceImpl implements RecentFilesService {

    private final FileRepository fileRepository;
    private final AuditRepository auditRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<StorageDto.Item> getRecentFiles(String username, String type, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long contextWsId = WorkspaceContextHolder.getCurrentWorkspaceId();

        if ("DOWNLOADED".equalsIgnoreCase(type) || "OPENED".equalsIgnoreCase(type)) {
            // Find recent files from audit logs
            Specification<AuditEvent> auditSpec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                predicates.add(cb.equal(root.get("username"), username));
                predicates.add(cb.equal(root.get("entityType"), EntityType.FILE));

                if (contextWsId != null) {
                    predicates.add(cb.equal(root.get("workspaceId"), contextWsId));
                }

                if ("DOWNLOADED".equalsIgnoreCase(type)) {
                    predicates.add(cb.or(
                            cb.equal(root.get("eventType"), AuditEventType.FILE_DOWNLOADED),
                            cb.equal(root.get("eventType"), AuditEventType.SHARE_DOWNLOADED)
                    ));
                } else { // OPENED
                    predicates.add(cb.or(
                            cb.equal(root.get("eventType"), AuditEventType.FILE_DOWNLOADED),
                            cb.equal(root.get("eventType"), AuditEventType.SHARE_VIEWED),
                            cb.equal(root.get("eventType"), AuditEventType.FILE_CREATED),
                            cb.equal(root.get("eventType"), AuditEventType.FILE_UPDATED)
                    ));
                }
                query.orderBy(cb.desc(root.get("createdAt")));
                return cb.and(predicates.toArray(new Predicate[0]));
            };

            // Query audit logs paginated
            Page<AuditEvent> eventsPage = auditRepository.findAll(auditSpec, pageable);
            List<Long> fileIds = eventsPage.getContent().stream()
                    .map(AuditEvent::getEntityId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());

            if (fileIds.isEmpty()) {
                return Page.empty(pageable);
            }

            // Retrieve files from db
            List<FileMetadata> files = fileRepository.findAllById(fileIds).stream()
                    .filter(f -> !f.isDeleted())
                    .collect(Collectors.toList());

            // Order files matching the audit log sequence
            Map<Long, FileMetadata> fileMap = files.stream()
                    .collect(Collectors.toMap(FileMetadata::getId, f -> f));

            List<StorageDto.Item> items = eventsPage.getContent().stream()
                    .map(AuditEvent::getEntityId)
                    .map(fileMap::get)
                    .filter(Objects::nonNull)
                    .distinct()
                    .map(this::mapToDto)
                    .collect(Collectors.toList());

            return new PageImpl<>(items, pageable, eventsPage.getTotalElements());

        } else {
            // "UPLOADED", "MODIFIED", "ALL" -> Query FileMetadata sorted by uploadDate DESC
            Specification<FileMetadata> spec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
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
