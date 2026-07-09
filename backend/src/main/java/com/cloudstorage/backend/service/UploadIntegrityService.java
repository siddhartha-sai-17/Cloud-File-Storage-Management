package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.dto.UploadIntegrityReportDto;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.UploadChunkRepository;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import com.cloudstorage.backend.security.UploadSessionStateMachine;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class UploadIntegrityService {

    private static final Logger logger = LoggerFactory.getLogger(UploadIntegrityService.class);

    private final UploadSessionRepository uploadSessionRepository;
    private final UploadChunkRepository uploadChunkRepository;
    private final ChunkStorageService chunkStorageService;
    private final UploadSessionStateMachine stateMachine;
    private final UploadAuditService uploadAuditService;
    private final UploadBufferPool uploadBufferPool;

    @Autowired
    @Lazy
    private UploadIntegrityService self;

    /**
     * Entrypoint for verifying the integrity of an entire upload session.
     * Changes session status to VERIFYING during verification to protect against concurrent writes/verify calls.
     */
    public UploadIntegrityReportDto verifySession(String username, String sessionId, String clientChecksum) {
        logger.info("Session Integrity Verification Started: sessionId={}, username={}, clientChecksum={}", sessionId, username, clientChecksum);

        // Load session and validate owner
        UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            throw new UploadOwnershipException("Access denied to upload session");
        }

        // Validate state transition to VERIFYING (this also acts as concurrency protection)
        self.transitionSessionStatus(sessionId, UploadSessionStatus.VERIFYING);

        long startTime = System.currentTimeMillis();
        boolean integrityPassed = true;
        int verifiedChunks = 0;
        int uploadedChunksCount = 0;

        List<Integer> corruptedChunks = new ArrayList<>();
        List<Integer> missingChunks = new ArrayList<>();
        List<Integer> failedChunks = new ArrayList<>();
        List<UploadIntegrityReportDto.ChunkVerificationDetail> details = new ArrayList<>();

        int totalChunks = session.getTotalChunks();

        byte[] buffer = uploadBufferPool.borrowBuffer();
        try {
            // Find all uploaded chunks for this session
            Map<Integer, UploadedChunk> chunkMap = new HashMap<>();
            for (UploadedChunk chunk : uploadChunkRepository.findByUploadSessionOrderByChunkNumber(session)) {
                chunkMap.put(chunk.getChunkNumber(), chunk);
            }

            for (int chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
                UploadedChunk chunk = chunkMap.get(chunkNumber);
                UploadIntegrityReportDto.ChunkVerificationDetail.ChunkVerificationDetailBuilder detailBuilder =
                        UploadIntegrityReportDto.ChunkVerificationDetail.builder().chunkNumber(chunkNumber);

                if (chunk == null) {
                    // Chunk record missing in database
                    integrityPassed = false;
                    missingChunks.add(chunkNumber);
                    details.add(detailBuilder
                            .status(ChunkStatus.MISSING.name())
                            .valid(false)
                            .error("Chunk metadata missing in database")
                            .build());
                    continue;
                }

                // Check physical file existence and integrity
                boolean isPhysicalValid = true;
                String errorMsg = null;
                long actualSize = 0;
                String actualChecksum = null;

                // 1. Check physical existence
                try (InputStream is = chunkStorageService.getChunkStream(sessionId, chunkNumber)) {
                    // 2. Measure actual size and compute hash in a streaming pass
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    int bytesRead;
                    while ((bytesRead = is.read(buffer)) != -1) {
                        digest.update(buffer, 0, bytesRead);
                        actualSize += bytesRead;
                    }
                    byte[] hash = digest.digest();
                    StringBuilder hexString = new StringBuilder();
                    for (byte b : hash) {
                        String hex = Integer.toHexString(0xff & b);
                        if (hex.length() == 1) hexString.append('0');
                        hexString.append(hex);
                    }
                    actualChecksum = hexString.toString();
                } catch (java.io.FileNotFoundException e) {
                    isPhysicalValid = false;
                    errorMsg = "Physical file not found on disk";
                } catch (Exception e) {
                    isPhysicalValid = false;
                    errorMsg = "Error reading physical file: " + e.getMessage();
                }

                if (isPhysicalValid) {
                    uploadedChunksCount++;
                    // Check file size match
                    if (actualSize != chunk.getChunkSize()) {
                        isPhysicalValid = false;
                        errorMsg = "Physical file size (" + actualSize + ") does not match metadata (" + chunk.getChunkSize() + ")";
                    }
                    // Check checksum match
                    else if (!actualChecksum.equalsIgnoreCase(chunk.getChecksum())) {
                        isPhysicalValid = false;
                        errorMsg = "Physical checksum (" + actualChecksum + ") does not match metadata (" + chunk.getChecksum() + ")";
                    }
                }

                if (isPhysicalValid) {
                    verifiedChunks++;
                    // Update chunk metadata to VERIFIED in database (transactional)
                    self.updateChunkStatus(chunk.getId(), ChunkStatus.VERIFIED, null, null);
                    uploadAuditService.logEvent(sessionId, username, "CHUNK_VERIFIED", "SUCCESS", "ChunkNumber: " + chunkNumber, null);
                    details.add(detailBuilder
                            .status(ChunkStatus.VERIFIED.name())
                            .checksum(chunk.getChecksum())
                            .valid(true)
                            .expectedSize(chunk.getChunkSize())
                            .actualSize(actualSize)
                            .build());
                } else {
                    integrityPassed = false;
                    if (errorMsg != null && errorMsg.contains("not found")) {
                        missingChunks.add(chunkNumber);
                        self.updateChunkStatus(chunk.getId(), ChunkStatus.MISSING, errorMsg, LocalDateTime.now());
                        details.add(detailBuilder
                                .status(ChunkStatus.MISSING.name())
                                .valid(false)
                                .error(errorMsg)
                                .expectedSize(chunk.getChunkSize())
                                .actualSize(actualSize)
                                .build());
                    } else {
                        corruptedChunks.add(chunkNumber);
                        self.updateChunkStatus(chunk.getId(), ChunkStatus.FAILED, errorMsg, LocalDateTime.now());
                        uploadAuditService.logEvent(sessionId, username, "CHUNK_CORRUPTED", "SUCCESS", "ChunkNumber: " + chunkNumber + ", Error: " + errorMsg, null);
                        details.add(detailBuilder
                                .status(ChunkStatus.FAILED.name())
                                .valid(false)
                                .error(errorMsg)
                                .expectedSize(chunk.getChunkSize())
                                .actualSize(actualSize)
                                .build());
                        // Delete the corrupted physical chunk so it doesn't cause issues
                        try {
                            chunkStorageService.deleteChunk(sessionId, chunkNumber);
                        } catch (IOException e) {
                            logger.error("Failed to delete corrupted chunk file for session {}, chunk {}", sessionId, chunkNumber, e);
                        }
                    }
                }
            }

            // Restore the state back to UPLOADING
            self.transitionSessionStatus(sessionId, UploadSessionStatus.UPLOADING);

            long duration = System.currentTimeMillis() - startTime;
            if (integrityPassed) {
                logger.info("Session Integrity Verification Success: sessionId={}", sessionId);
            } else {
                logger.warn("Session Integrity Verification Gaps Detected: sessionId={}, corrupted={}, missing={}",
                        sessionId, corruptedChunks, missingChunks);
            }

            return UploadIntegrityReportDto.builder()
                    .integrityPassed(integrityPassed)
                    .sessionId(sessionId)
                    .status(UploadSessionStatus.UPLOADING.name())
                    .totalChunks(totalChunks)
                    .verifiedChunks(verifiedChunks)
                    .uploadedChunks(uploadedChunksCount)
                    .missingChunksCount(missingChunks.size())
                    .corruptedChunksCount(corruptedChunks.size())
                    .corruptedChunks(corruptedChunks)
                    .missingChunks(missingChunks)
                    .failedChunks(failedChunks)
                    .verificationDuration(duration)
                    .verifiedAt(LocalDateTime.now())
                    .checksumAlgorithm("SHA-256")
                    .details(details)
                    .build();

        } catch (Exception ex) {
            logger.error("Error during session integrity verification: sessionId={}", sessionId, ex);
            // Revert state to UPLOADING in case of unhandled error
            try {
                self.transitionSessionStatus(sessionId, UploadSessionStatus.UPLOADING);
            } catch (Exception e) {
                // ignore
            }
            if (ex instanceof RuntimeException) {
                throw (RuntimeException) ex;
            } else {
                throw new RuntimeException("Integrity check failed: " + ex.getMessage(), ex);
            }
        } finally {
            uploadBufferPool.returnBuffer(buffer);
        }
    }

    /**
     * Verifies the integrity of a single chunk in the session.
     */
    public UploadIntegrityReportDto.ChunkVerificationDetail verifyChunk(String username, String sessionId, int chunkNumber, String clientChecksum) {
        logger.info("Chunk Integrity Verification Started: sessionId={}, chunkNumber={}, clientChecksum={}", sessionId, chunkNumber, clientChecksum);

        UploadSession session = uploadSessionRepository.findByIdWithUser(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));

        if (!session.getUser().getUsername().equals(username)) {
            throw new UploadOwnershipException("Access denied to upload session");
        }

        // Use transitionSessionStatus to VERIFYING (this blocks concurrent writes during verify)
        self.transitionSessionStatus(sessionId, UploadSessionStatus.VERIFYING);

        byte[] buffer = uploadBufferPool.borrowBuffer();
        try {
            UploadedChunk chunk = uploadChunkRepository.findByUploadSessionAndChunkNumber(session, chunkNumber)
                    .orElseThrow(() -> new UploadSessionNotFoundException("Chunk " + chunkNumber + " metadata not found"));

            boolean isPhysicalValid = true;
            String errorMsg = null;
            long actualSize = 0;
            String actualChecksum = null;

            try (InputStream is = chunkStorageService.getChunkStream(sessionId, chunkNumber)) {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    digest.update(buffer, 0, bytesRead);
                    actualSize += bytesRead;
                }
                byte[] hash = digest.digest();
                StringBuilder hexString = new StringBuilder();
                for (byte b : hash) {
                    String hex = Integer.toHexString(0xff & b);
                    if (hex.length() == 1) hexString.append('0');
                    hexString.append(hex);
                }
                actualChecksum = hexString.toString();
            } catch (java.io.FileNotFoundException e) {
                isPhysicalValid = false;
                errorMsg = "Physical file not found on disk";
            } catch (Exception e) {
                isPhysicalValid = false;
                errorMsg = "Error reading physical file: " + e.getMessage();
            }

            if (isPhysicalValid) {
                if (actualSize != chunk.getChunkSize()) {
                    isPhysicalValid = false;
                    errorMsg = "Physical file size (" + actualSize + ") does not match metadata (" + chunk.getChunkSize() + ")";
                } else if (!actualChecksum.equalsIgnoreCase(chunk.getChecksum())) {
                    isPhysicalValid = false;
                    errorMsg = "Physical checksum (" + actualChecksum + ") does not match metadata (" + chunk.getChecksum() + ")";
                } else if (clientChecksum != null && !actualChecksum.equalsIgnoreCase(clientChecksum)) {
                    isPhysicalValid = false;
                    errorMsg = "Physical checksum (" + actualChecksum + ") does not match client expectation (" + clientChecksum + ")";
                }
            }

            UploadIntegrityReportDto.ChunkVerificationDetail.ChunkVerificationDetailBuilder detailBuilder =
                    UploadIntegrityReportDto.ChunkVerificationDetail.builder().chunkNumber(chunkNumber);

            if (isPhysicalValid) {
                self.updateChunkStatus(chunk.getId(), ChunkStatus.VERIFIED, null, null);
                uploadAuditService.logEvent(sessionId, username, "CHUNK_VERIFIED", "SUCCESS", "ChunkNumber: " + chunkNumber, null);
                self.transitionSessionStatus(sessionId, UploadSessionStatus.UPLOADING);
                logger.info("Chunk Verification Success: sessionId={}, chunkNumber={}", sessionId, chunkNumber);
                return detailBuilder
                        .status(ChunkStatus.VERIFIED.name())
                        .checksum(chunk.getChecksum())
                        .valid(true)
                        .expectedSize(chunk.getChunkSize())
                        .actualSize(actualSize)
                        .build();
            } else {
                if (errorMsg != null && errorMsg.contains("not found")) {
                    self.updateChunkStatus(chunk.getId(), ChunkStatus.MISSING, errorMsg, LocalDateTime.now());
                } else {
                    self.updateChunkStatus(chunk.getId(), ChunkStatus.FAILED, errorMsg, LocalDateTime.now());
                    uploadAuditService.logEvent(sessionId, username, "CHUNK_CORRUPTED", "SUCCESS", "ChunkNumber: " + chunkNumber + ", Error: " + errorMsg, null);
                    try {
                        chunkStorageService.deleteChunk(sessionId, chunkNumber);
                    } catch (IOException e) {
                        logger.error("Failed to delete corrupted chunk file", e);
                    }
                }
                self.transitionSessionStatus(sessionId, UploadSessionStatus.UPLOADING);
                logger.warn("Chunk Verification Failed: sessionId={}, chunkNumber={}, error={}", sessionId, chunkNumber, errorMsg);
                throw new ChunkCorruptedException(errorMsg);
            }
        } catch (Exception ex) {
            try {
                self.transitionSessionStatus(sessionId, UploadSessionStatus.UPLOADING);
            } catch (Exception e) {
                // ignore
            }
            if (ex instanceof RuntimeException) {
                throw (RuntimeException) ex;
            } else {
                throw new RuntimeException("Chunk integrity check failed: " + ex.getMessage(), ex);
            }
        } finally {
            uploadBufferPool.returnBuffer(buffer);
        }
    }

    @Transactional
    public void transitionSessionStatus(String sessionId, UploadSessionStatus targetStatus) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new UploadSessionNotFoundException("Upload session not found"));
        stateMachine.validateTransition(session.getStatus(), targetStatus);
        session.setStatus(targetStatus);
        uploadSessionRepository.save(session);
    }

    @Transactional
    public void updateChunkStatus(Long chunkId, ChunkStatus status, String failureReason, LocalDateTime failureAt) {
        UploadedChunk chunk = uploadChunkRepository.findById(chunkId).orElse(null);
        if (chunk != null) {
            chunk.setStatus(status);
            if (status == ChunkStatus.VERIFIED) {
                chunk.setVerifiedAt(LocalDateTime.now());
                chunk.setChecksumAlgorithm("SHA-256");
            } else if (status == ChunkStatus.FAILED || status == ChunkStatus.MISSING) {
                chunk.setLastFailureReason(failureReason);
                chunk.setLastFailureAt(failureAt);
                chunk.setRetryCount(chunk.getRetryCount() + 1);
            }
            uploadChunkRepository.save(chunk);
        }
    }
}
