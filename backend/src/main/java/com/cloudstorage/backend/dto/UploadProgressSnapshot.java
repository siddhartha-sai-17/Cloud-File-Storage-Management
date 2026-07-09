package com.cloudstorage.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayDeque;

@Data
public class UploadProgressSnapshot {
    private final String sessionId;
    private final String filename;
    private final long fileSize;
    private final int totalChunks;

    private volatile long uploadedBytes = 0L;
    private volatile int uploadedChunks = 0;
    private volatile long progressVersion = 0L;
    private volatile long peakSpeedBps = 0L;
    private volatile long currentSpeedBps = 0L;
    private volatile long averageSpeedBps = 0L;
    private volatile long etaSeconds = -1L;
    private volatile LocalDateTime lastActivityAt;
    private volatile LocalDateTime lastChunkCompletedAt;
    private volatile String status = "INITIALIZED";
    private volatile String retryState = "NONE";
    private volatile String queueState = "QUEUED";
    private volatile int parallelActiveChunks = 0;

    // Sliding window of chunk speeds, max size 10
    private final ArrayDeque<Long> recentChunkSpeeds = new ArrayDeque<>(10);

    public UploadProgressSnapshot(String sessionId, String filename, long fileSize, int totalChunks) {
        this.sessionId = sessionId;
        this.filename = filename;
        this.fileSize = fileSize;
        this.totalChunks = totalChunks;
        this.lastActivityAt = LocalDateTime.now();
    }

    public synchronized void updateProgress(long chunkBytes, long durationMs) {
        this.uploadedBytes = Math.min(this.fileSize, this.uploadedBytes + chunkBytes);
        this.uploadedChunks = Math.min(this.totalChunks, this.uploadedChunks + 1);
        this.progressVersion++;
        this.lastChunkCompletedAt = LocalDateTime.now();
        this.lastActivityAt = LocalDateTime.now();

        if (durationMs > 0) {
            long speed = (chunkBytes * 1000) / durationMs;
            this.currentSpeedBps = speed;
            if (speed > this.peakSpeedBps) {
                this.peakSpeedBps = speed;
            }

            recentChunkSpeeds.addLast(speed);
            if (recentChunkSpeeds.size() > 10) {
                recentChunkSpeeds.removeFirst();
            }

            long sum = 0;
            for (Long s : recentChunkSpeeds) {
                sum += s;
            }
            this.averageSpeedBps = sum / recentChunkSpeeds.size();
        }

        long remainingBytes = this.fileSize - this.uploadedBytes;
        long speedForEta = this.averageSpeedBps > 0 ? this.averageSpeedBps : this.currentSpeedBps;
        if (speedForEta > 0) {
            this.etaSeconds = remainingBytes / speedForEta;
        } else {
            this.etaSeconds = -1L;
        }
    }

    public synchronized void recordRetry(int attempt) {
        this.retryState = "RETRYING_" + attempt;
        this.lastActivityAt = LocalDateTime.now();
    }

    public synchronized void recordState(String status) {
        this.status = status;
        this.lastActivityAt = LocalDateTime.now();
    }

    public synchronized void recordQueueState(String queueState) {
        this.queueState = queueState;
        this.lastActivityAt = LocalDateTime.now();
    }

    public synchronized void recordParallelActive(int active) {
        this.parallelActiveChunks = active;
        this.lastActivityAt = LocalDateTime.now();
    }
}
