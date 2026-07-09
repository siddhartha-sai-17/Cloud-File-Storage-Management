package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.dto.UploadProgressDto;
import com.cloudstorage.backend.dto.UploadProgressSnapshot;
import com.cloudstorage.backend.entity.UploadSession;
import com.cloudstorage.backend.entity.UploadSessionStatus;
import com.cloudstorage.backend.repository.UploadSessionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UploadProgressService {

    private static final Logger logger = LoggerFactory.getLogger(UploadProgressService.class);

    private final UploadConfig uploadConfig;
    private final UploadSessionRepository uploadSessionRepository;

    private UploadProgressService self;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy UploadProgressService self) {
        this.self = self;
    }

    // Cache of active session progress
    private final ConcurrentHashMap<String, UploadProgressSnapshot> activeProgress = new ConcurrentHashMap<>();

    // Tracks which sessions have memory updates that need to be flushed to the DB
    private final ConcurrentHashMap<String, Boolean> dirtySessions = new ConcurrentHashMap<>();

    @PostConstruct
    public void recoverProgressFromDb() {
        try {
            logger.info("Starting recovery of active upload progress from database...");
            // Recover sessions that are not completed or cancelled
            List<UploadSession> activeSessions = uploadSessionRepository.findAll().stream()
                    .filter(s -> s.getStatus() != UploadSessionStatus.COMPLETED 
                              && s.getStatus() != UploadSessionStatus.CANCELLED)
                    .collect(Collectors.toList());

            int recoveredCount = 0;
            for (UploadSession session : activeSessions) {
                UploadProgressSnapshot snapshot = new UploadProgressSnapshot(
                        session.getId(),
                        session.getFilename(),
                        session.getSize(),
                        session.getTotalChunks()
                );
                snapshot.setUploadedBytes(session.getUploadedBytes() != null ? session.getUploadedBytes() : 0L);
                snapshot.setUploadedChunks(session.getUploadedChunks() != null ? session.getUploadedChunks() : 0);
                snapshot.setPeakSpeedBps(session.getPeakSpeedBps() != null ? session.getPeakSpeedBps() : 0L);
                snapshot.setCurrentSpeedBps(session.getCurrentSpeedBps() != null ? session.getCurrentSpeedBps() : 0L);
                snapshot.setAverageSpeedBps(session.getAverageSpeedBps() != null ? session.getAverageSpeedBps() : 0L);
                snapshot.setEtaSeconds(session.getEtaSeconds() != null ? session.getEtaSeconds() : -1L);
                snapshot.setStatus(session.getStatus().name());
                snapshot.setProgressVersion(session.getProgressVersion() != null ? session.getProgressVersion() : 0L);
                snapshot.setLastActivityAt(session.getLastActivityAt());
                snapshot.setLastChunkCompletedAt(session.getLastChunkCompleted());

                activeProgress.put(session.getId(), snapshot);
                recoveredCount++;
            }
            logger.info("Successfully recovered {} active upload sessions into progress cache.", recoveredCount);
        } catch (Exception e) {
            logger.error("Error recovering progress from DB", e);
        }
    }

    public UploadProgressSnapshot getOrCreateSnapshot(String sessionId, String filename, long fileSize, int totalChunks) {
        return activeProgress.computeIfAbsent(sessionId, id -> 
            new UploadProgressSnapshot(id, filename, fileSize, totalChunks)
        );
    }

    public UploadProgressSnapshot getSnapshot(String sessionId) {
        return activeProgress.get(sessionId);
    }

    public void recordChunkComplete(String sessionId, long chunkBytes, long durationMs) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot != null) {
            snapshot.updateProgress(chunkBytes, durationMs);
            dirtySessions.put(sessionId, Boolean.TRUE);
        }
    }

    public void recordRetry(String sessionId, int attempt) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot != null) {
            snapshot.recordRetry(attempt);
            dirtySessions.put(sessionId, Boolean.TRUE);
        }
    }

    public void markComplete(String sessionId) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot != null) {
            snapshot.recordState("COMPLETED");
            snapshot.setUploadedBytes(snapshot.getFileSize());
            snapshot.setUploadedChunks(snapshot.getTotalChunks());
            snapshot.setEtaSeconds(0L);
            dirtySessions.put(sessionId, Boolean.TRUE);
            // Synchronously flush completed session progress so it's guaranteed saved
            flushSessionToDb(sessionId);
            activeProgress.remove(sessionId);
        }
    }

    public void markPaused(String sessionId) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot != null) {
            snapshot.recordState("PAUSED");
            dirtySessions.put(sessionId, Boolean.TRUE);
        }
    }

    public void markResumed(String sessionId) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot != null) {
            snapshot.recordState("UPLOADING");
            dirtySessions.put(sessionId, Boolean.TRUE);
        }
    }

    public void recordQueueState(String sessionId, String queueState) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot != null) {
            snapshot.recordQueueState(queueState);
            dirtySessions.put(sessionId, Boolean.TRUE);
        }
    }

    public void recordParallelActive(String sessionId, int active) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot != null) {
            snapshot.recordParallelActive(active);
            dirtySessions.put(sessionId, Boolean.TRUE);
        }
    }

    public UploadProgressDto getProgress(String sessionId) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot == null) {
            // Check DB as fallback
            return uploadSessionRepository.findById(sessionId)
                    .map(this::mapToDto)
                    .orElse(null);
        }
        return mapToDto(snapshot);
    }

    public List<UploadProgressDto> getAllActiveProgress() {
        return activeProgress.values().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<UploadProgressDto> getHistory(int page, int size) {
        // Expose a quick mockup history page (or read COMPLETED sessions from repository)
        return uploadSessionRepository.findAll().stream()
                .filter(s -> s.getStatus() == UploadSessionStatus.COMPLETED)
                .sorted((s1, s2) -> s2.getUpdatedAt().compareTo(s1.getUpdatedAt()))
                .skip((long) page * size)
                .limit(size)
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Scheduled(fixedDelayString = "${upload.progress.db-update-interval-ms:1000}")
    public void flushProgressToDb() {
        if (!uploadConfig.isProgressEnabled()) {
            return;
        }
        Set<String> sessionIds = new HashSet<>(dirtySessions.keySet());
        for (String sessionId : sessionIds) {
            dirtySessions.remove(sessionId);
            try {
                self.flushSessionToDb(sessionId);
            } catch (Exception e) {
                logger.error("Failed to flush progress snapshot to DB for session: {}", sessionId, e);
                // Put back in dirty queue to retry later
                dirtySessions.put(sessionId, Boolean.TRUE);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void flushSessionToDb(String sessionId) {
        UploadProgressSnapshot snapshot = activeProgress.get(sessionId);
        if (snapshot == null) {
            return;
        }
        
        long uploadedBytes;
        int uploadedChunks;
        long currentSpeed;
        long averageSpeed;
        long peakSpeed;
        long etaSeconds;
        long progressVersion;
        LocalDateTime lastChunkCompletedAt;
        long fileSize;
        
        synchronized (snapshot) {
            uploadedBytes = snapshot.getUploadedBytes();
            uploadedChunks = snapshot.getUploadedChunks();
            currentSpeed = snapshot.getCurrentSpeedBps();
            averageSpeed = snapshot.getAverageSpeedBps();
            peakSpeed = snapshot.getPeakSpeedBps();
            etaSeconds = snapshot.getEtaSeconds();
            progressVersion = snapshot.getProgressVersion();
            lastChunkCompletedAt = snapshot.getLastChunkCompletedAt();
            fileSize = snapshot.getFileSize();
        }
        
        double pct = (double) uploadedBytes / fileSize * 100.0;
        uploadSessionRepository.updateProgressFields(
                sessionId,
                uploadedBytes,
                uploadedChunks,
                pct,
                currentSpeed,
                averageSpeed,
                peakSpeed,
                etaSeconds,
                progressVersion,
                LocalDateTime.now(),
                lastChunkCompletedAt
        );
    }

    public UploadProgressDto mapToDto(UploadProgressSnapshot snapshot) {
        long remainingBytes = snapshot.getFileSize() - snapshot.getUploadedBytes();
        int remainingChunks = snapshot.getTotalChunks() - snapshot.getUploadedChunks();
        double pct = (double) snapshot.getUploadedBytes() / snapshot.getFileSize() * 100.0;

        return UploadProgressDto.builder()
                .sessionId(snapshot.getSessionId())
                .filename(snapshot.getFilename())
                .fileSize(snapshot.getFileSize())
                .uploadedBytes(snapshot.getUploadedBytes())
                .remainingBytes(remainingBytes)
                .uploadedChunks(snapshot.getUploadedChunks())
                .remainingChunks(remainingChunks)
                .totalChunks(snapshot.getTotalChunks())
                .uploadPercentage(pct)
                .currentSpeedBps(snapshot.getCurrentSpeedBps())
                .averageSpeedBps(snapshot.getAverageSpeedBps())
                .peakSpeedBps(snapshot.getPeakSpeedBps())
                .etaSeconds(snapshot.getEtaSeconds())
                .lastActivityAt(snapshot.getLastActivityAt())
                .lastChunkCompletedAt(snapshot.getLastChunkCompletedAt())
                .status(snapshot.getStatus())
                .retryState(snapshot.getRetryState())
                .queueState(snapshot.getQueueState())
                .parallelActiveChunks(snapshot.getParallelActiveChunks())
                .progressVersion(snapshot.getProgressVersion())
                .build();
    }

    public UploadProgressDto mapToDto(UploadSession session) {
        long bytes = session.getUploadedBytes() != null ? session.getUploadedBytes() : 0L;
        int chunks = session.getUploadedChunks() != null ? session.getUploadedChunks() : 0;
        long remainingBytes = session.getSize() - bytes;
        int remainingChunks = session.getTotalChunks() - chunks;
        double pct = session.getUploadPercentage() != null ? session.getUploadPercentage() : 0.0;

        return UploadProgressDto.builder()
                .sessionId(session.getId())
                .filename(session.getFilename())
                .fileSize(session.getSize())
                .uploadedBytes(bytes)
                .remainingBytes(remainingBytes)
                .uploadedChunks(chunks)
                .remainingChunks(remainingChunks)
                .totalChunks(session.getTotalChunks())
                .uploadPercentage(pct)
                .currentSpeedBps(session.getCurrentSpeedBps() != null ? session.getCurrentSpeedBps() : 0L)
                .averageSpeedBps(session.getAverageSpeedBps() != null ? session.getAverageSpeedBps() : 0L)
                .peakSpeedBps(session.getPeakSpeedBps() != null ? session.getPeakSpeedBps() : 0L)
                .etaSeconds(session.getEtaSeconds() != null ? session.getEtaSeconds() : -1L)
                .lastActivityAt(session.getLastActivityAt())
                .lastChunkCompletedAt(session.getLastChunkCompleted())
                .status(session.getStatus().name())
                .retryState("NONE")
                .queueState("DONE")
                .parallelActiveChunks(0)
                .progressVersion(session.getProgressVersion() != null ? session.getProgressVersion() : 0L)
                .build();
    }
}
