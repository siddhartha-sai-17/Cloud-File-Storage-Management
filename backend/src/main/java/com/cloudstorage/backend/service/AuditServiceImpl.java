package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AuditEventDto;
import com.cloudstorage.backend.dto.AuditMetadata;
import com.cloudstorage.backend.entity.AuditEvent;
import com.cloudstorage.backend.entity.AuditEventType;
import com.cloudstorage.backend.entity.EntityType;
import com.cloudstorage.backend.repository.AuditRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private static final Logger logger = LoggerFactory.getLogger(AuditServiceImpl.class);
    private final AuditRepository auditRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(Long workspaceId, Long userId, String username, AuditEventType eventType,
                          EntityType entityType, Long entityId, String description,
                          String status, AuditMetadata metadata) {
        try {
            String metadataJson = null;
            String ipAddress = null;
            String userAgent = null;
            Long duration = null;

            if (metadata != null) {
                metadataJson = objectMapper.writeValueAsString(metadata);
                ipAddress = metadata.getClientIp();
                userAgent = metadata.getUserAgent();
                duration = metadata.getExecutionDuration();
            }

            AuditEvent event = AuditEvent.builder()
                    .workspaceId(workspaceId)
                    .userId(userId)
                    .username(username != null ? username : "System")
                    .eventType(eventType)
                    .entityType(entityType)
                    .entityId(entityId)
                    .description(description)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .processingTimeMs(duration)
                    .status(status)
                    .metadataJson(metadataJson)
                    .build();

            auditRepository.save(event);
        } catch (Exception e) {
            // Never let audit logging failure rollback the main business transaction
            logger.error("Failed to log audit event {}: {}", eventType, e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditEventDto> queryAudit(Long workspaceId, String username, AuditEventType eventType,
                                           LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<AuditEvent> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (workspaceId != null) {
                predicates.add(cb.equal(root.get("workspaceId"), workspaceId));
            }
            if (username != null && !username.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("username"), username));
            }
            if (eventType != null) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditRepository.findAll(spec, pageable).map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditEventDto> searchAudit(String keyword, Pageable pageable) {
        Specification<AuditEvent> spec = (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String pattern = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("description")), pattern),
                    cb.like(cb.lower(root.get("username")), pattern),
                    cb.like(cb.lower(root.get("status")), pattern)
            );
        };

        return auditRepository.findAll(spec, pageable).map(this::mapToDto);
    }

    @Override
    @Transactional
    public void cleanup(int retentionDays) {
        LocalDateTime threshold = LocalDateTime.now().minusDays(retentionDays);
        Specification<AuditEvent> spec = (root, query, cb) -> cb.lessThan(root.get("createdAt"), threshold);
        List<AuditEvent> oldEvents = auditRepository.findAll(spec);
        auditRepository.deleteAllInBatch(oldEvents);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> statistics() {
        Map<String, Object> stats = new HashMap<>();
        long total = auditRepository.count();
        stats.put("totalEvents", total);
        return stats;
    }

    private AuditEventDto mapToDto(AuditEvent event) {
        return AuditEventDto.builder()
                .id(event.getId())
                .workspaceId(event.getWorkspaceId())
                .userId(event.getUserId())
                .username(event.getUsername())
                .eventType(event.getEventType())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .description(event.getDescription())
                .ipAddress(event.getIpAddress())
                .userAgent(event.getUserAgent())
                .createdAt(event.getCreatedAt())
                .processingTimeMs(event.getProcessingTimeMs())
                .status(event.getStatus())
                .metadataJson(event.getMetadataJson())
                .build();
    }
}
