package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.ActivityTimelineDto;
import com.cloudstorage.backend.entity.AuditEvent;
import com.cloudstorage.backend.entity.EntityType;
import com.cloudstorage.backend.repository.AuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ActivityTimelineServiceImpl implements ActivityTimelineService {

    private final AuditRepository auditRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ActivityTimelineDto> getWorkspaceActivity(Long workspaceId, Pageable pageable) {
        Specification<AuditEvent> spec = (root, query, cb) -> cb.equal(root.get("workspaceId"), workspaceId);
        return auditRepository.findAll(spec, pageable).map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ActivityTimelineDto> getUserActivity(Long userId, Pageable pageable) {
        Specification<AuditEvent> spec = (root, query, cb) -> cb.equal(root.get("userId"), userId);
        return auditRepository.findAll(spec, pageable).map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ActivityTimelineDto> getFileActivity(Long fileId, Pageable pageable) {
        Specification<AuditEvent> spec = (root, query, cb) -> 
            cb.and(
                cb.equal(root.get("entityType"), EntityType.FILE),
                cb.equal(root.get("entityId"), fileId)
            );
        return auditRepository.findAll(spec, pageable).map(this::mapToDto);
    }

    private ActivityTimelineDto mapToDto(AuditEvent event) {
        return ActivityTimelineDto.builder()
                .id(event.getId())
                .workspaceId(event.getWorkspaceId())
                .username(event.getUsername())
                .eventType(event.getEventType())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .description(event.getDescription())
                .status(event.getStatus())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
