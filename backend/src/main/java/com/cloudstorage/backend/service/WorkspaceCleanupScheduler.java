package com.cloudstorage.backend.service;

import com.cloudstorage.backend.repository.WorkspaceInvitationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class WorkspaceCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(WorkspaceCleanupScheduler.class);

    private final WorkspaceInvitationRepository workspaceInvitationRepository;
    private final PermissionService permissionService;

    @Scheduled(fixedDelay = 3600000) // Every hour
    public void cleanup() {
        logger.info("Starting workspace cleanup tasks...");
        try {
            int deletedInvitations = workspaceInvitationRepository.deleteExpiredInvitations(LocalDateTime.now());
            permissionService.clearExpiredPermissions();
            logger.info("Workspace cleanup finished. Deleted {} expired invitations.", deletedInvitations);
        } catch (Exception e) {
            logger.error("Error during workspace cleanup execution", e);
        }
    }
}
