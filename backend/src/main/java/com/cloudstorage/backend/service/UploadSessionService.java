package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.dto.UploadSessionDto;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.FolderRepository;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceRepository;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UploadSessionService {

    private static final Logger logger = LoggerFactory.getLogger(UploadSessionService.class);
    
    // Pattern to reject invalid characters in filenames: control characters, path traversals, or illegal characters
    private static final Pattern INVALID_FILENAME_PATTERN = Pattern.compile("[\\\\/:*?\"<>|\\x00-\\x1F]");

    private final UploadSessionRepository uploadSessionRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final UploadConfig uploadConfig;
    private final UploadRetryScheduler uploadRetryScheduler;
    private final UploadQueueService uploadQueueService;
    private final UploadProgressService uploadProgressService;
    private final UploadAuditService uploadAuditService;
    private final WorkspaceService workspaceService;
    private final WorkspaceQuotaService workspaceQuotaService;
    private final WorkspaceRepository workspaceRepository;
    private final AuditService auditService;

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public UploadSessionDto.Response createSession(String username, UploadSessionDto.Request request) {
        User user = getUser(username);

        // 1. Validate Client Upload ID
        String clientUploadId = request.getClientUploadId();
        if (clientUploadId == null || clientUploadId.trim().isEmpty()) {
            logger.warn("Validation Failure: clientUploadId missing for user {}", username);
            throw new InvalidUploadRequestException("Client upload ID is required");
        }

        // 2. Validate Filename
        String filename = request.getFilename();
        if (filename == null || filename.trim().isEmpty()) {
            logger.warn("Validation Failure: Empty or blank filename for user {}", username);
            throw new InvalidUploadRequestException("Filename cannot be empty");
        }
        if (filename.length() > 255) {
            logger.warn("Validation Failure: Filename too long ({}) for user {}", filename.length(), username);
            throw new InvalidUploadRequestException("Filename exceeds maximum length of 255 characters");
        }
        if (filename.contains("..") || INVALID_FILENAME_PATTERN.matcher(filename).find()) {
            logger.warn("Validation Failure: Invalid filename characters or traversal: {} for user {}", filename, username);
            throw new InvalidUploadRequestException("Filename contains invalid characters or path traversal sequences");
        }

        // 3. Validate File Size
        Long size = request.getSize();
        if (size == null || size <= 0) {
            logger.warn("Validation Failure: Invalid file size ({}) for user {}", size, username);
            throw new InvalidUploadRequestException("File size must be positive and greater than zero");
        }
        if (size > uploadConfig.getMaxFileSize()) {
            logger.warn("Validation Failure: File size ({}) exceeds limit ({}) for user {}", size, uploadConfig.getMaxFileSize(), username);
            throw new InvalidUploadRequestException("File size exceeds maximum allowed upload limit");
        }

        // 4. Validate Chunk Size
        Long chunkSize = request.getChunkSize();
        if (chunkSize == null) {
            chunkSize = uploadConfig.getDefaultChunkSize();
        } else if (chunkSize < uploadConfig.getMinChunkSize() || chunkSize > uploadConfig.getMaxChunkSize()) {
            logger.warn("Validation Failure: Invalid chunk size ({}) outside range [{}, {}] for user {}", 
                    chunkSize, uploadConfig.getMinChunkSize(), uploadConfig.getMaxChunkSize(), username);
            throw new InvalidChunkSizeException("Chunk size must be between 256 KB and 50 MB");
        }

        // 5. Validate Target Folder
        Long folderId = request.getFolderId();
        if (folderId != null) {
            Folder folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new InvalidUploadRequestException("Target folder not found"));
            if (!folder.getUser().getId().equals(user.getId())) {
                logger.warn("Unauthorized Folder Access Attempt: folderId={} by user {}", folderId, username);
                throw new UploadOwnershipException("Access denied to target folder");
            }
            if (folder.isDeleted()) {
                logger.warn("Validation Failure: Target folder {} is soft-deleted or in trash for user {}", folderId, username);
                throw new InvalidUploadRequestException("Cannot upload to a deleted folder or folder in trash");
            }
        }

        // 5a. Resolve workspace and validate quota
        Workspace workspace = resolveWorkspace(username);
        workspaceQuotaService.validateUploadQuota(workspace.getId(), size);
        logger.debug("Workspace resolved for upload session: workspaceId={}, username={}", workspace.getId(), username);

        // 6. Prevent Duplicate Sessions (Idempotency Check)
        // Check for active sessions (INITIALIZED, UPLOADING, PAUSED) with same clientUploadId & user
        List<UploadSessionStatus> activeStatuses = List.of(
                UploadSessionStatus.INITIALIZED,
                UploadSessionStatus.UPLOADING,
                UploadSessionStatus.PAUSED
        );
        if (uploadSessionRepository.existsByClientUploadIdAndUserAndStatusIn(clientUploadId, user, activeStatuses)) {
            UploadSession existing = uploadSessionRepository.findByClientUploadIdAndUser(clientUploadId, user)
                    .orElseThrow(() -> new RuntimeException("Inconsistent DB state for clientUploadId"));
            
            logger.info("Duplicate Upload Session Reused: sessionId={}, username={}, clientUploadId={}", 
                    existing.getId(), username, clientUploadId);

            // Update activity audit fields
            existing.setLastActivityAt(LocalDateTime.now());
            existing.setUpdatedAt(LocalDateTime.now());
            uploadSessionRepository.save(existing);

            return mapToDto(existing);
        }

        // 7. Calculate Chunks and Expiry
        int totalChunks = (int) Math.ceil((double) size / chunkSize);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(uploadConfig.getSessionExpirationHours());

        // 8. Create Session
        UploadSession session = new UploadSession();
        session.setId(UUID.randomUUID().toString());
        session.setFilename(filename);
        session.setSize(size);
        session.setContentType(request.getContentType() != null ? request.getContentType() : "application/octet-stream");
        session.setFolderId(folderId);
        session.setUser(user);
        session.setWorkspaceId(workspace.getId());
        session.setStatus(UploadSessionStatus.INITIALIZED);
        session.setClientUploadId(clientUploadId);
        session.setTotalChunks(totalChunks);
        session.setChunkSize(chunkSize);
        session.setCreatedBy(username);
        session.setCreatedAt(now);
        session.setLastActivityAt(now);
        session.setUpdatedAt(now);
        session.setExpiresAt(expiresAt);
        session.setChangeDescription(request.getChangeDescription());

        session = uploadSessionRepository.save(session);
        uploadAuditService.logEvent(session.getId(), username, "SESSION_CREATED", "SUCCESS", "Filename: " + filename + ", Size: " + size, null);

        auditService.logEvent(workspace.getId(), user.getId(), user.getUsername(),
            com.cloudstorage.backend.entity.AuditEventType.UPLOAD_STARTED,
            com.cloudstorage.backend.entity.EntityType.UPLOAD_SESSION, null,
            "Upload session started for file: " + filename, "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());

        logger.info("Upload Session Created: sessionId={}, username={}, clientUploadId={}, status={}", 
                session.getId(), username, clientUploadId, session.getStatus());

        // Enqueue session into priority queue if enabled
        com.cloudstorage.backend.entity.UploadPriority priority =
                request.getPriority() != null ? request.getPriority() : com.cloudstorage.backend.entity.UploadPriority.NORMAL;
        final String finalSessionId = session.getId();
        uploadQueueService.enqueue(finalSessionId, username, priority, clientUploadId, filename, size);

        // Initialize Progress Snapshot
        uploadProgressService.getOrCreateSnapshot(finalSessionId, filename, size, totalChunks);

        return mapToDto(session);
    }

    @Transactional
    public UploadSessionDto.Response getSession(String username, String sessionId) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> {
                    logger.warn("Retrieval Failure: Session {} not found for user {}", sessionId, username);
                    return new UploadSessionNotFoundException("Upload session not found");
                });

        // Verify Ownership
        if (!session.getUser().getUsername().equals(username)) {
            logger.warn("Unauthorized Access Attempt: sessionId={} owned by {} accessed by {}", 
                    sessionId, session.getUser().getUsername(), username);
            throw new UploadOwnershipException("Access denied to upload session");
        }

        // Check if Expired
        if (session.getExpiresAt().isBefore(LocalDateTime.now()) && session.getStatus() != UploadSessionStatus.EXPIRED) {
            session.setStatus(UploadSessionStatus.EXPIRED);
            session.setUpdatedAt(LocalDateTime.now());
            session.setLastActivityAt(LocalDateTime.now());
            uploadSessionRepository.save(session);
            
            logger.info("Session Expired: sessionId={}, username={}", sessionId, username);
            throw new UploadSessionExpiredException("Upload session has expired");
        }
        
        if (session.getStatus() == UploadSessionStatus.EXPIRED) {
            throw new UploadSessionExpiredException("Upload session has expired");
        }

        // Update activity audit
        session.setLastActivityAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        session = uploadSessionRepository.save(session);

        logger.info("Upload Session Retrieved: sessionId={}, username={}, status={}", 
                sessionId, username, session.getStatus());

        return mapToDto(session);
    }

    @Transactional
    public UploadSessionDto.Response cancelSession(String username, String sessionId) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> {
                    logger.warn("Cancellation Failure: Session {} not found for user {}", sessionId, username);
                    return new UploadSessionNotFoundException("Upload session not found");
                });

        // Verify Ownership
        if (!session.getUser().getUsername().equals(username)) {
            logger.warn("Unauthorized Access Attempt (Cancellation): sessionId={} owned by {} accessed by {}", 
                    sessionId, session.getUser().getUsername(), username);
            throw new UploadOwnershipException("Access denied to upload session");
        }

        if (session.getStatus() == UploadSessionStatus.COMPLETED) {
            logger.warn("Cancellation Failure: Session {} already completed for user {}", sessionId, username);
            throw new UploadSessionAlreadyCompletedException("Cannot cancel an already completed upload session");
        }

        // Cancel Session
        session.setStatus(UploadSessionStatus.CANCELLED);
        session.setLastActivityAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        session = uploadSessionRepository.save(session);
        uploadAuditService.logEvent(sessionId, username, "SESSION_DELETED", "SUCCESS", "ClientUploadId: " + session.getClientUploadId(), null);
        uploadAuditService.logEvent(sessionId, username, "UPLOAD_DELETED", "SUCCESS", "ClientUploadId: " + session.getClientUploadId(), null);

        // Cancel retry tasks after commit
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    uploadRetryScheduler.cancelRetries(sessionId);
                    uploadQueueService.cancel(sessionId);
                }
            });
        } else {
            uploadRetryScheduler.cancelRetries(sessionId);
            uploadQueueService.cancel(sessionId);
        }


        logger.info("Upload Session Cancelled: sessionId={}, username={}, clientUploadId={}", 
                sessionId, username, session.getClientUploadId());

        return mapToDto(session);
    }

    /**
     * Resolve the active workspace for the current request.
     * If a workspace context is explicitly set (e.g. via X-Workspace-Id header), uses that workspace.
     * Falls back to the user's personal workspace if no workspace context is set.
     */
    private Workspace resolveWorkspace(String username) {
        Long contextWsId = WorkspaceContextHolder.getCurrentWorkspaceId();
        if (contextWsId != null) {
            return workspaceRepository.findById(contextWsId)
                    .orElseGet(() -> workspaceService.getOrCreatePersonalWorkspace(username));
        }
        return workspaceService.getOrCreatePersonalWorkspace(username);
    }

    private UploadSessionDto.Response mapToDto(UploadSession session) {
        return UploadSessionDto.Response.builder()
                .sessionId(session.getId())
                .filename(session.getFilename())
                .size(session.getSize())
                .status(session.getStatus().name())
                .clientUploadId(session.getClientUploadId())
                .totalChunks(session.getTotalChunks())
                .chunkSize(session.getChunkSize())
                .uploadedChunks(session.getUploadedChunks())
                .uploadedBytes(session.getUploadedBytes())
                .createdAt(session.getCreatedAt())
                .lastActivityAt(session.getLastActivityAt())
                .expiresAt(session.getExpiresAt())
                .changeDescription(session.getChangeDescription())
                .build();
    }
}
