package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.exception.WorkspaceQuotaExceededException;
import com.cloudstorage.backend.repository.WorkspaceRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceQuotaService {

    private final WorkspaceRepository workspaceRepository;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public void validateUploadQuota(Long workspaceId, Long sizeToUpload) {
        if (workspaceId == null) {
            return;
        }
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found: " + workspaceId));

        if (workspace.getStorageUsed() + sizeToUpload > workspace.getStorageQuota()) {
            throw new WorkspaceQuotaExceededException("Upload exceeds storage quota. Used: " 
                    + workspace.getStorageUsed() + " bytes, Quota: " + workspace.getStorageQuota() + " bytes.");
        }
    }

    @Transactional
    public void incrementStorageUsed(Long workspaceId, Long bytes) {
        if (workspaceId == null || bytes == null || bytes <= 0) {
            return;
        }
        Workspace workspace = workspaceRepository.findByIdForUpdate(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found: " + workspaceId));

        if (workspace.getStorageUsed() + bytes > workspace.getStorageQuota()) {
            throw new WorkspaceQuotaExceededException("Operation would exceed storage quota.");
        }

        workspace.setStorageUsed(workspace.getStorageUsed() + bytes);
        workspaceRepository.save(workspace);
    }

    @Transactional
    public void decrementStorageUsed(Long workspaceId, Long bytes) {
        if (workspaceId == null || bytes == null || bytes <= 0) {
            return;
        }
        Workspace workspace = workspaceRepository.findByIdForUpdate(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found: " + workspaceId));

        long newUsed = workspace.getStorageUsed() - bytes;
        workspace.setStorageUsed(Math.max(0L, newUsed));
        workspaceRepository.save(workspace);
    }

    @Transactional
    public void recalculateWorkspaceStorage(Long workspaceId) {
        if (workspaceId == null) {
            return;
        }
        Workspace workspace = workspaceRepository.findByIdForUpdate(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found: " + workspaceId));

        Long totalUsed = entityManager.createQuery(
                "SELECT COALESCE(SUM(f.size), 0L) FROM FileMetadata f WHERE f.workspace.id = :workspaceId AND f.deleted = false", Long.class)
                .setParameter("workspaceId", workspaceId)
                .getSingleResult();

        workspace.setStorageUsed(totalUsed);
        workspaceRepository.save(workspace);
    }
}
