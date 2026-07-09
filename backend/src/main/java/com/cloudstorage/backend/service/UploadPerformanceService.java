package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.UploadPerformanceSnapshot;
import com.cloudstorage.backend.dto.UploadPerformanceSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.DoubleAccumulator;

@Service
@RequiredArgsConstructor
public class UploadPerformanceService {

    private final UploadBufferPool bufferPool;
    private final ThreadPoolTaskExecutor parallelUploadExecutor;

    private final Map<String, SessionPerformanceTracker> trackers = new ConcurrentHashMap<>();

    private final AtomicLong totalChunksProcessed = new AtomicLong(0);
    private final AtomicLong totalBytesUploaded = new AtomicLong(0);
    private final AtomicLong totalChunkProcessingTimeMs = new AtomicLong(0);
    private final AtomicLong totalChecksumTimeMs = new AtomicLong(0);
    private final DoubleAccumulator systemPeakThroughput = new DoubleAccumulator(Double::max, 0.0);

    public static class SessionPerformanceTracker {
        final String sessionId;
        final String filename;
        final long fileSize;
        final AtomicLong uploadedBytes = new AtomicLong(0);
        final AtomicInteger uploadedChunks = new AtomicInteger(0);
        final AtomicLong chunkProcessingTimeSum = new AtomicLong(0);
        final AtomicLong checksumTimeSum = new AtomicLong(0);
        final AtomicLong startTime = new AtomicLong(System.currentTimeMillis());
        final DoubleAccumulator peakThroughput = new DoubleAccumulator(Double::max, 0.0);

        volatile long mergeDurationMs = 0;
        volatile long objectStorageUploadDurationMs = 0;
        volatile long databaseCommitDurationMs = 0;
        volatile long retryOverheadMs = 0;

        public SessionPerformanceTracker(String sessionId, String filename, long fileSize) {
            this.sessionId = sessionId;
            this.filename = filename;
            this.fileSize = fileSize;
        }
    }

    public void startSession(String sessionId, String filename, long fileSize) {
        trackers.put(sessionId, new SessionPerformanceTracker(sessionId, filename, fileSize));
    }

    public void recordChunk(String sessionId, long chunkSize, long durationMs, long checksumTimeMs) {
        totalChunksProcessed.incrementAndGet();
        totalBytesUploaded.addAndGet(chunkSize);
        totalChunkProcessingTimeMs.addAndGet(durationMs);
        totalChecksumTimeMs.addAndGet(checksumTimeMs);

        SessionPerformanceTracker tracker = trackers.get(sessionId);
        if (tracker != null) {
            tracker.uploadedBytes.addAndGet(chunkSize);
            tracker.uploadedChunks.incrementAndGet();
            tracker.chunkProcessingTimeSum.addAndGet(durationMs);
            tracker.checksumTimeSum.addAndGet(checksumTimeMs);

            double speedMbS = 0.0;
            long elapsed = System.currentTimeMillis() - tracker.startTime.get();
            if (elapsed > 0) {
                speedMbS = (double) tracker.uploadedBytes.get() / (1024 * 1024) / (elapsed / 1000.0);
            }
            tracker.peakThroughput.accumulate(speedMbS);
            systemPeakThroughput.accumulate(speedMbS);
        }
    }

    public void recordMerge(String sessionId, long durationMs) {
        SessionPerformanceTracker tracker = trackers.get(sessionId);
        if (tracker != null) {
            tracker.mergeDurationMs = durationMs;
        }
    }

    public void recordObjectStorageUpload(String sessionId, long durationMs) {
        SessionPerformanceTracker tracker = trackers.get(sessionId);
        if (tracker != null) {
            tracker.objectStorageUploadDurationMs = durationMs;
        }
    }

    public void recordDatabaseCommit(String sessionId, long durationMs) {
        SessionPerformanceTracker tracker = trackers.get(sessionId);
        if (tracker != null) {
            tracker.databaseCommitDurationMs = durationMs;
        }
    }

    public void recordRetryOverhead(String sessionId, long durationMs) {
        SessionPerformanceTracker tracker = trackers.get(sessionId);
        if (tracker != null) {
            tracker.retryOverheadMs += durationMs;
        }
    }

    public UploadPerformanceSnapshot getSnapshot(String sessionId) {
        SessionPerformanceTracker tracker = trackers.get(sessionId);
        if (tracker == null) {
            return null;
        }

        long elapsed = System.currentTimeMillis() - tracker.startTime.get();
        double currentThroughput = 0.0;
        if (elapsed > 0) {
            currentThroughput = (double) tracker.uploadedBytes.get() / (1024 * 1024) / (elapsed / 1000.0);
        }

        double avgChunkTime = tracker.uploadedChunks.get() > 0
                ? (double) tracker.chunkProcessingTimeSum.get() / tracker.uploadedChunks.get()
                : 0.0;
        double avgChecksumTime = tracker.uploadedChunks.get() > 0
                ? (double) tracker.checksumTimeSum.get() / tracker.uploadedChunks.get()
                : 0.0;

        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();

        double executorUtil = 0.0;
        int activeCount = parallelUploadExecutor.getActiveCount();
        int poolSize = parallelUploadExecutor.getPoolSize();
        if (poolSize > 0) {
            executorUtil = (double) activeCount / poolSize * 100.0;
        }

        return UploadPerformanceSnapshot.builder()
                .sessionId(sessionId)
                .uploadThroughputMbS(currentThroughput)
                .averageThroughputMbS(currentThroughput)
                .peakThroughputMbS(tracker.peakThroughput.get())
                .averageChunkProcessingTimeMs(avgChunkTime)
                .averageChecksumTimeMs(avgChecksumTime)
                .mergeDurationMs(tracker.mergeDurationMs)
                .objectStorageUploadDurationMs(tracker.objectStorageUploadDurationMs)
                .databaseCommitDurationMs(tracker.databaseCommitDurationMs)
                .retryOverheadMs(tracker.retryOverheadMs)
                .memoryUsedBytes(usedMemory)
                .memoryMaxBytes(runtime.maxMemory())
                .bufferPoolSize(bufferPool.getPoolSize())
                .bufferPoolActiveAllocations(bufferPool.getActiveAllocations())
                .executorUtilization(executorUtil)
                .build();
    }

    public UploadPerformanceSummaryDto getAggregatedPerformance() {
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();

        double avgChunkTime = totalChunksProcessed.get() > 0
                ? (double) totalChunkProcessingTimeMs.get() / totalChunksProcessed.get()
                : 0.0;
        double avgChecksumTime = totalChunksProcessed.get() > 0
                ? (double) totalChecksumTimeMs.get() / totalChunksProcessed.get()
                : 0.0;

        double systemAvgThroughput = 0.0;
        long totalElapsed = 0;
        long totalBytes = 0;
        List<UploadPerformanceSnapshot> sessionSnapshots = new ArrayList<>();
        for (String sessionId : trackers.keySet()) {
            SessionPerformanceTracker t = trackers.get(sessionId);
            if (t != null) {
                totalBytes += t.uploadedBytes.get();
                totalElapsed += (System.currentTimeMillis() - t.startTime.get());
                sessionSnapshots.add(getSnapshot(sessionId));
            }
        }
        if (totalElapsed > 0) {
            systemAvgThroughput = (double) totalBytes / (1024 * 1024) / (totalElapsed / 1000.0);
        }

        double executorUtil = 0.0;
        int activeCount = parallelUploadExecutor.getActiveCount();
        int poolSize = parallelUploadExecutor.getPoolSize();
        if (poolSize > 0) {
            executorUtil = (double) activeCount / poolSize * 100.0;
        }

        return UploadPerformanceSummaryDto.builder()
                .systemAverageThroughputMbS(systemAvgThroughput)
                .systemPeakThroughputMbS(systemPeakThroughput.get())
                .totalChunksProcessed(totalChunksProcessed.get())
                .systemAverageChunkProcessingTimeMs(avgChunkTime)
                .systemAverageChecksumTimeMs(avgChecksumTime)
                .totalBytesUploaded(totalBytesUploaded.get())
                .systemMemoryUsedBytes(usedMemory)
                .systemMemoryMaxBytes(runtime.maxMemory())
                .bufferPoolSize(bufferPool.getPoolSize())
                .bufferPoolActiveAllocations(bufferPool.getActiveAllocations())
                .executorUtilization(executorUtil)
                .sessionSnapshots(sessionSnapshots)
                .build();
    }
}
