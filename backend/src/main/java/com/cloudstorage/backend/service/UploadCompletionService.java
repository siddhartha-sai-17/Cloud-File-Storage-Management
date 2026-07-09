package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.*;
import com.cloudstorage.backend.security.UploadSessionStateMachine;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UploadCompletionService {

    private static final Logger logger = LoggerFactory.getLogger(UploadCompletionService.class);

    private final UploadSessionRepository uploadSessionRepository;
    private final UploadChunkRepository uploadChunkRepository;
    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final ChunkStorageService chunkStorageService;
    private final ChunkMergeService chunkMergeService;
    private final ObjectStorageService objectStorageService;
    private final ClassificationService classificationService;
    private final UploadSessionStateMachine stateMachine;
    private final UploadConfig uploadConfig;
    private final ParallelUploadCoordinator parallelUploadCoordinator;
    private final UploadQueueService uploadQueueService;
    private final UploadProgressService uploadProgressService;
    private final UploadAuditService uploadAuditService;
    private final UploadPerformanceService uploadPerformanceService;
    private final FileVersionService fileVersionService;
    private final OcrProcessingService ocrProcessingService;
    private final WorkspaceRepository workspaceRepository;
    private final AuditService auditService;

    @Autowired
    @Lazy
    private UploadCompletionService self;

    /**
     * Public coordination method to complete an upload session.
     * Not annotated with @Transactional to keep long filesystem and network operations outside DB transactions.
     */
    public CompleteResponse completeUpload(String username, String sessionId, String clientChecksum) {
        logger.info("Upload Completion Started: sessionId={}, username={}, clientChecksum={}", sessionId, username, clientChecksum);

        // Verify no active concurrent uploads
        if (parallelUploadCoordinator.getActiveUploadsCount(sessionId) > 0) {
            logger.warn("Completion Failure: Session {} has active uploads", sessionId);
            throw new com.cloudstorage.backend.exception.ConcurrentCompletionException("Cannot complete upload session: chunk uploads are still active");
        }

        // 1. Fetch and validate session
        UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (session.getStatus() == UploadSessionStatus.PAUSED) {
            logger.warn("Completion Failure: Session {} is PAUSED", sessionId);
            throw new UploadSessionNotActiveException("Cannot complete an upload session that is currently paused");
        }

        if (!session.getUser().getUsername().equals(username)) {
            logger.warn("Unauthorized Completion Access Attempt: sessionId={} owned by {} accessed by {}",
                    sessionId, session.getUser().getUsername(), username);
            throw new UploadOwnershipException("Access denied to upload session");
        }

        // Idempotency: If already completed, return existing file details
        if (session.getStatus() == UploadSessionStatus.COMPLETED) {
            logger.info("Completion Idempotency: Upload session {} is already COMPLETED. Returning existing file details.", sessionId);
            FileMetadata fileMeta = fileRepository.findById(session.getFileId())
                    .orElseThrow(() -> new UploadCompletionException("Upload session marked completed but file metadata not found"));
            return mapToCompleteResponse(session, fileMeta);
        }

        if (session.getStatus() == UploadSessionStatus.CANCELLED) {
            logger.warn("Completion Failure: Session {} is CANCELLED", sessionId);
            throw new UploadSessionNotActiveException("Cannot complete a cancelled upload session");
        }

        if (session.getStatus() == UploadSessionStatus.FAILED) {
            logger.warn("Completion Failure: Session {} has FAILED", sessionId);
            throw new UploadSessionNotActiveException("Cannot complete a failed upload session");
        }

        if (session.getStatus() == UploadSessionStatus.VERIFYING) {
            logger.warn("Completion Failure: Session {} is VERIFYING", sessionId);
            throw new UploadSessionNotActiveException("Cannot complete an upload session that is currently verifying integrity");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            self.markSessionFailed(sessionId);
            logger.warn("Completion Failure: Session {} has expired", sessionId);
            throw new UploadSessionExpiredException("Upload session has expired");
        }

        // 2. Validate chunk completeness
        validateChunks(session);

        // 3. Transition to FINALIZING
        self.transitionSessionStatus(sessionId, UploadSessionStatus.FINALIZING);

        String tempMergedPath = null;
        String checksum = null;
        long mergedSize = 0;
        String objectStoragePath = null;
        boolean isDuplicate = false;

        LocalDateTime mergeStart = LocalDateTime.now();
        LocalDateTime objectUploadStart = null;
        LocalDateTime objectUploadEnd = null;

        try {
            // 4. Chunk Merge
            logger.info("Chunk Merge Started: sessionId={}, totalChunks={}", sessionId, session.getTotalChunks());
            uploadAuditService.logEvent(sessionId, username, "MERGE_STARTED", "SUCCESS", "Total chunks to merge: " + session.getTotalChunks(), null);
            MergeResult mergeResult = chunkMergeService.mergeChunks(sessionId, session.getTotalChunks());
            tempMergedPath = mergeResult.getFilePath();
            checksum = mergeResult.getSha256();
            mergedSize = mergeResult.getSize();
            LocalDateTime mergeEnd = LocalDateTime.now();

            long mergeDurationMs = Duration.between(mergeStart, mergeEnd).toMillis();
            logger.info("Chunk Merge Completed: sessionId={}, checksum={}, size={}", sessionId, checksum, mergedSize);
            uploadAuditService.logEvent(sessionId, username, "MERGE_FINISHED", "SUCCESS", "Merged size: " + mergedSize + ", Sha256: " + checksum, mergeDurationMs);

            // Validate against session size
            if (mergedSize != session.getSize()) {
                logger.error("Size Mismatch: Session expected {} bytes, but merged file size is {} bytes for session {}",
                        session.getSize(), mergedSize, sessionId);
                throw new UploadIncompleteException("Merged file size does not match expected upload session size");
            }

            // Optional checksum validation
            if (clientChecksum != null && !clientChecksum.trim().isEmpty()) {
                if (!clientChecksum.equalsIgnoreCase(checksum)) {
                    logger.warn("Checksum Mismatch: Client checksum {} != Merged checksum {} for session {}",
                            clientChecksum, checksum, sessionId);
                    throw new FinalChecksumMismatchException("Client provided checksum does not match the merged file checksum");
                }
            }

            // 5. Deduplication
            Optional<FileMetadata> duplicate = fileRepository.findFirstBySha256AndDeletedFalse(checksum);
            if (duplicate.isPresent() && objectStorageService.objectExists(duplicate.get().getStoragePath())) {
                isDuplicate = true;
                objectStoragePath = duplicate.get().getStoragePath();
                logger.info("Deduplication Hit: sessionId={}, checksum={}, storagePath={}", sessionId, checksum, objectStoragePath);
            } else {
                if (duplicate.isPresent()) {
                    logger.warn("Deduplication record found but MinIO object missing for sessionId={}, checksum={}. Uploading fresh.", sessionId, checksum);
                } else {
                    logger.info("Deduplication Miss: sessionId={}, checksum={}", sessionId, checksum);
                }
                objectStoragePath = UUID.randomUUID().toString() + "_" + session.getFilename();

                // 6. Object Storage Upload
                objectUploadStart = LocalDateTime.now();
                logger.info("Object Upload Started: sessionId={}, storagePath={}", sessionId, objectStoragePath);
                InputStream rawStream = Files.newInputStream(Paths.get(tempMergedPath));
                InputStream bufferedStream = uploadConfig.isPerformanceEnableStreaming()
                        ? new BufferedInputStream(rawStream, uploadConfig.getPerformanceBufferSize())
                        : rawStream;
                try (InputStream is = bufferedStream) {
                    objectStorageService.uploadFile(objectStoragePath, is, mergedSize, session.getContentType());
                } catch (Exception e) {
                    throw new ObjectStorageException("Failed to upload merged file to object storage: " + e.getMessage(), e);
                }
                objectUploadEnd = LocalDateTime.now();

                logger.info("Object Upload Completed: sessionId={}, storagePath={}", sessionId, objectStoragePath);
            }

            // 7. Commit Metadata & Session updates in transactional block
            long uploadDurationMs = Duration.between(
                    session.getUploadStartedAt() != null ? session.getUploadStartedAt() : session.getCreatedAt(),
                    LocalDateTime.now()
            ).toMillis();
            long objectUploadDurationMs = (objectUploadStart != null && objectUploadEnd != null)
                    ? Duration.between(objectUploadStart, objectUploadEnd).toMillis() : 0L;

            long dbCommitStart = System.currentTimeMillis();
            java.util.concurrent.locks.ReentrantLock fileLock = fileVersionService.getFileLock(
                    session.getUser().getUsername(),
                    session.getFolderId(),
                    session.getFilename()
            );
            fileLock.lock();
            FileMetadata fileMeta;
            try {
                fileMeta = self.saveMetadataAndCompleteTransaction(
                        sessionId, checksum, mergedSize, objectStoragePath, isDuplicate,
                        mergeDurationMs, uploadDurationMs, objectUploadDurationMs
                );
            } finally {
                fileLock.unlock();
            }
            long dbCommitDurationMs = System.currentTimeMillis() - dbCommitStart;

            uploadPerformanceService.recordMerge(sessionId, mergeDurationMs);
            if (objectUploadStart != null && objectUploadEnd != null) {
                uploadPerformanceService.recordObjectStorageUpload(sessionId, objectUploadDurationMs);
            }
            uploadPerformanceService.recordDatabaseCommit(sessionId, dbCommitDurationMs);

            uploadAuditService.logEvent(sessionId, username, "UPLOAD_COMPLETED", "SUCCESS", "File ID: " + fileMeta.getId() + ", Path: " + fileMeta.getStoragePath(), uploadDurationMs);

            if (fileMeta != null) {
                ocrProcessingService.queueOcrJob(fileMeta.getId());
            }

            // 8. Success Cleanup
            logger.info("Cleanup Started: sessionId={}", sessionId);
            try {
                chunkStorageService.deleteSession(sessionId);
                logger.info("Cleanup Completed: sessionId={}", sessionId);
            } catch (Exception cleanupEx) {
                logger.warn("Cleanup Warning: Failed to clean temporary directory for session {}: {}", sessionId, cleanupEx.getMessage());
            }

            logger.info("Upload Completed Successfully: sessionId={}, fileId={}, storagePath={}",
                    sessionId, fileMeta.getId(), fileMeta.getStoragePath());

            UploadSession completedSession = uploadSessionRepository.findByIdWithUser(sessionId)
                    .orElse(session);
            return mapToCompleteResponse(completedSession, fileMeta);

        } catch (Exception e) {
            long duration = Duration.between(mergeStart, LocalDateTime.now()).toMillis();
            logger.error("Upload Finalization Failure: sessionId={}, error={}", sessionId, e.getMessage(), e);
            uploadAuditService.logEvent(sessionId, username, "MERGE_FAILED", "FAILURE", "Error: " + e.getMessage(), duration);
            uploadAuditService.logEvent(sessionId, username, "UPLOAD_FAILED", "FAILURE", "Error: " + e.getMessage(), duration);
            executeFailureRecovery(sessionId, tempMergedPath, objectStoragePath, isDuplicate);
            if (e instanceof RuntimeException) {
                throw (RuntimeException) e;
            } else {
                throw new UploadCompletionException("Failed to complete upload: " + e.getMessage(), e);
            }
        }
    }

    /**
     * Transition session state within validation checks.
     */
    @Transactional
    public void transitionSessionStatus(String sessionId, UploadSessionStatus targetStatus) {
        UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));
        stateMachine.validateTransition(session.getStatus(), targetStatus);
        session.setStatus(targetStatus);
        uploadSessionRepository.save(session);
    }

    /**
     * Mark session as FAILED in a separate transaction on terminal failure.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSessionFailed(String sessionId) {
        try {
            UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId).orElse(null);
            if (session != null) {
                session.setStatus(UploadSessionStatus.FAILED);
                uploadSessionRepository.save(session);
                logger.info("Session transitioned to FAILED: sessionId={}", sessionId);
            }
        } catch (Exception e) {
            logger.error("Failed to mark session as FAILED: sessionId={}", sessionId, e);
        }
    }

    /**
     * Transactional block to persist FileMetadata, delete chunks, and set session to COMPLETED.
     */
    @Transactional
    public FileMetadata saveMetadataAndCompleteTransaction(
            String sessionId, String checksum, long size, String storagePath, boolean deduplicated,
            long mergeDurationMs, long uploadDurationMs, long objectUploadDurationMs) {

        UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        // Load target folder
        Folder folder = null;
        if (session.getFolderId() != null) {
            folder = folderRepository.findById(session.getFolderId())
                    .orElseThrow(() -> new UploadCompletionException("Target folder not found"));
        }

        // Save File Metadata or Create Version
        Optional<FileMetadata> existingFileOpt;
        if (folder == null) {
            existingFileOpt = fileRepository.findByUserAndFilenameAndFolderIsNullAndDeletedFalse(session.getUser(), session.getFilename());
        } else {
            existingFileOpt = fileRepository.findByUserAndFilenameAndFolderAndDeletedFalse(session.getUser(), session.getFilename(), folder);
        }

        FileMetadata metadata;
        if (existingFileOpt.isPresent()) {
            metadata = existingFileOpt.get();
            String category = classificationService.classifyFile(session.getFilename(), session.getContentType());
            fileVersionService.createNewVersion(
                    metadata,
                    storagePath,
                    checksum,
                    size,
                    session.getContentType(),
                    category,
                    0.90,
                    metadata.getTags(),
                    session.getChangeDescription(),
                    null,
                    session.getUser().getUsername(),
                    false // isNewFile
            );
        } else {
            metadata = new FileMetadata();
            metadata.setFilename(session.getFilename());
            metadata.setSize(size);
            metadata.setContentType(session.getContentType());
            metadata.setStoragePath(storagePath);
            metadata.setUser(session.getUser());
            metadata.setFolder(folder);
            metadata.setSha256(checksum);
            metadata.setCategory(classificationService.classifyFile(session.getFilename(), session.getContentType()));
            metadata.setConfidenceScore(0.90);
            metadata.setStarred(false);
            metadata.setDeleted(false);
            // Associate with the workspace resolved at session creation
            if (session.getWorkspaceId() != null) {
                workspaceRepository.findById(session.getWorkspaceId())
                        .ifPresent(metadata::setWorkspace);
            }
            metadata = fileRepository.save(metadata);

            fileVersionService.createNewVersion(
                    metadata,
                    storagePath,
                    checksum,
                    size,
                    session.getContentType(),
                    metadata.getCategory(),
                    metadata.getConfidenceScore(),
                    metadata.getTags(),
                    session.getChangeDescription(),
                    null,
                    session.getUser().getUsername(),
                    true // isNewFile
            );
        }

        // Update Upload Session
        session.setStatus(UploadSessionStatus.COMPLETED);
        session.setCompletedAt(LocalDateTime.now());
        session.setChecksum(checksum);
        session.setFileId(metadata.getId());
        session.setDeduplicated(deduplicated);

        // Diagnostics metrics
        session.setAverageChunkSize(session.getSize() / session.getTotalChunks());
        session.setUploadDuration(uploadDurationMs);
        uploadSessionRepository.save(session);

        // Delete database chunk markers
        uploadChunkRepository.deleteByUploadSession(session);

        // Remove from upload queue
        uploadQueueService.complete(sessionId);

        // Mark complete in progress tracker
        if (uploadProgressService != null) {
            uploadProgressService.markComplete(sessionId);
        }

        auditService.logEvent(session.getWorkspaceId(), session.getUser().getId(), session.getUser().getUsername(),
            com.cloudstorage.backend.entity.AuditEventType.UPLOAD_COMPLETED,
            com.cloudstorage.backend.entity.EntityType.FILE, metadata.getId(),
            "File uploaded: " + metadata.getFilename(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());

        logger.info("Transaction Committed: File metadata created (id={}), session {} COMPLETED.", metadata.getId(), sessionId);
        return metadata;
    }

    /**
     * Validate chunk completeness by database counts and physical filesystem checks.
     */
    private void validateChunks(UploadSession session) {
        logger.info("Chunk Verification Started: sessionId={}, expectedChunks={}", session.getId(), session.getTotalChunks());

        long chunkCount = uploadChunkRepository.countByUploadSession(session);
        if (chunkCount != session.getTotalChunks()) {
            logger.warn("Chunk Validation Failure: sessionId={}, expected={}, found={}",
                    session.getId(), session.getTotalChunks(), chunkCount);
            throw new UploadIncompleteException("Chunk count mismatch. Expected: "
                    + session.getTotalChunks() + ", found: " + chunkCount);
        }

        List<UploadedChunk> chunks = uploadChunkRepository.findByUploadSessionOrderByChunkNumber(session);
        if (chunks.size() != session.getTotalChunks()) {
            throw new UploadIncompleteException("Chunk ordering count mismatch");
        }

        for (int i = 0; i < session.getTotalChunks(); i++) {
            UploadedChunk chunk = chunks.get(i);
            int expectedNumber = i + 1;

            if (chunk.getChunkNumber() != expectedNumber) {
                logger.warn("Chunk Validation Failure (Missing/Out-of-Sequence): sessionId={}, missing chunkNumber={}",
                        session.getId(), expectedNumber);
                throw new UploadIncompleteException("Incomplete chunk sequence. Missing chunk: " + expectedNumber);
            }

            if (chunk.getStatus() != ChunkStatus.UPLOADED && chunk.getStatus() != ChunkStatus.VERIFIED) {
                logger.warn("Chunk Validation Failure (Invalid State): sessionId={}, chunkNumber={}, status={}",
                        session.getId(), chunk.getChunkNumber(), chunk.getStatus());
                throw new UploadIncompleteException("Chunk " + chunk.getChunkNumber() + " is in an invalid status: " + chunk.getStatus());
            }

            // Physical check will happen during merge
        }
    }

    /**
     * Execute rollback cleanup on failures before transaction commits.
     */
    private void executeFailureRecovery(String sessionId, String tempMergedPath, String objectStoragePath, boolean isDuplicate) {
        logger.info("Rollback Executed: sessionId={}", sessionId);

        // Mark session failed in a new transaction
        self.markSessionFailed(sessionId);

        // Cleanup temporary merged file
        if (tempMergedPath != null) {
            try {
                File tempFile = new File(tempMergedPath);
                if (tempFile.exists()) {
                    if (tempFile.delete()) {
                        logger.info("Rollback Cleanup: Deleted merged.tmp at {}", tempMergedPath);
                    }
                }
            } catch (Exception e) {
                logger.error("Rollback Cleanup Failure: Failed to delete merged.tmp for session {}: {}", sessionId, e.getMessage());
            }
        }

        // Cleanup orphan MinIO object (if uploaded and not a deduplicated hit)
        if (objectStoragePath != null && !isDuplicate) {
            try {
                objectStorageService.deleteFile(objectStoragePath);
                logger.info("Rollback Cleanup: Deleted orphan object from storage: {}", objectStoragePath);
            } catch (Exception e) {
                logger.error("Rollback Cleanup Failure: Failed to delete object {} for session {}: {}",
                        objectStoragePath, sessionId, e.getMessage());
            }
        }
        uploadAuditService.logEvent(sessionId, "SYSTEM", "ROLLBACK", "SUCCESS", "Rollback cleanup finished for session: " + sessionId, null);
    }

    private CompleteResponse mapToCompleteResponse(UploadSession session, FileMetadata fileMeta) {
        return CompleteResponse.builder()
                .sessionId(session.getId())
                .fileId(fileMeta.getId())
                .status(session.getStatus().name())
                .checksum(fileMeta.getSha256())
                .size(fileMeta.getSize())
                .storagePath(fileMeta.getStoragePath())
                .completedAt(session.getCompletedAt())
                .deduplicated(session.getDeduplicated() != null ? session.getDeduplicated() : false)
                .build();
    }

    @lombok.Data
    @lombok.Builder
    public static class CompleteResponse {
        private String sessionId;
        private Long fileId;
        private String status;
        private String checksum;
        private Long size;
        private String storagePath;
        private LocalDateTime completedAt;
        private boolean deduplicated;
    }
}
