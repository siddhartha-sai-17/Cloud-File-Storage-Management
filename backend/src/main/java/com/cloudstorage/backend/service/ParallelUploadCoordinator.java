package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.exception.ChunkAlreadyUploadingException;
import com.cloudstorage.backend.exception.ParallelUploadException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;

@Service
@RequiredArgsConstructor
public class ParallelUploadCoordinator {

    private final UploadConfig uploadConfig;
    private final ThreadPoolTaskExecutor parallelUploadExecutor;
    private UploadProgressService uploadProgressService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setUploadProgressService(@org.springframework.context.annotation.Lazy UploadProgressService uploadProgressService) {
        this.uploadProgressService = uploadProgressService;
    }

    // Maps sessionId -> Set of active chunk numbers
    private final Map<String, Set<Integer>> activeUploads = new ConcurrentHashMap<>();
    
    // Maps sessionId -> Semaphore for throttling concurrent chunks per session
    private final ConcurrentHashMap<String, Semaphore> sessionSemaphores = new ConcurrentHashMap<>();

    public void acquireSessionPermit(String sessionId) {
        Semaphore semaphore = sessionSemaphores.computeIfAbsent(sessionId, k -> 
            new Semaphore(uploadConfig.getParallelMaxChunksPerSession())
        );
        try {
            semaphore.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ParallelUploadException("Interrupted while waiting for upload slot", e);
        }
    }

    public void releaseSessionPermit(String sessionId) {
        Semaphore semaphore = sessionSemaphores.get(sessionId);
        if (semaphore != null) {
            semaphore.release();
        }
    }

    public synchronized void registerUpload(String sessionId, int chunkNumber) {
        Set<Integer> chunks = activeUploads.computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet());
        
        // Try to add chunkNumber; if add returns false, the chunk is already uploading
        if (!chunks.add(chunkNumber)) {
            throw new ChunkAlreadyUploadingException("Chunk " + chunkNumber + " is already uploading for session " + sessionId);
        }
        if (uploadProgressService != null) {
            uploadProgressService.recordParallelActive(sessionId, chunks.size());
        }
    }

    public synchronized void finishUpload(String sessionId, int chunkNumber) {
        Set<Integer> chunks = activeUploads.get(sessionId);
        if (chunks != null) {
            chunks.remove(chunkNumber);
            if (uploadProgressService != null) {
                uploadProgressService.recordParallelActive(sessionId, chunks.size());
            }
            if (chunks.isEmpty()) {
                activeUploads.remove(sessionId);
                sessionSemaphores.remove(sessionId);
            }
        }
    }

    public void cancelUpload(String sessionId, int chunkNumber) {
        finishUpload(sessionId, chunkNumber);
    }

    public boolean isChunkUploading(String sessionId, int chunkNumber) {
        Set<Integer> chunks = activeUploads.get(sessionId);
        return chunks != null && chunks.contains(chunkNumber);
    }

    public int getActiveUploadsCount(String sessionId) {
        Set<Integer> chunks = activeUploads.get(sessionId);
        return chunks != null ? chunks.size() : 0;
    }

    public Map<String, Set<Integer>> getActiveUploads() {
        return Collections.unmodifiableMap(activeUploads);
    }

    /**
     * Exposes monitoring statistics.
     */
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Active uploads
        int totalActiveUploads = 0;
        Map<String, Integer> sessionUploadCounts = new HashMap<>();
        for (Map.Entry<String, Set<Integer>> entry : activeUploads.entrySet()) {
            int count = entry.getValue().size();
            totalActiveUploads += count;
            sessionUploadCounts.put(entry.getKey(), count);
        }
        stats.put("totalActiveUploads", totalActiveUploads);
        stats.put("sessionUploadCounts", sessionUploadCounts);

        // Thread pool details
        int activeCount = parallelUploadExecutor.getActiveCount();
        int poolSize = parallelUploadExecutor.getPoolSize();
        int corePoolSize = parallelUploadExecutor.getCorePoolSize();
        int maxPoolSize = parallelUploadExecutor.getMaxPoolSize();
        int queueSize = parallelUploadExecutor.getThreadPoolExecutor().getQueue().size();

        stats.put("activeThreads", activeCount);
        stats.put("poolSize", poolSize);
        stats.put("corePoolSize", corePoolSize);
        stats.put("maxPoolSize", maxPoolSize);
        stats.put("queueDepth", queueSize);

        double workerUtilization = maxPoolSize > 0 ? (double) activeCount / maxPoolSize : 0.0;
        stats.put("workerUtilization", workerUtilization);

        Map<String, Integer> threadStats = new HashMap<>();
        threadStats.put("activeCount", activeCount);
        threadStats.put("poolSize", poolSize);
        threadStats.put("corePoolSize", corePoolSize);
        threadStats.put("maxPoolSize", maxPoolSize);
        stats.put("threadStatistics", threadStats);

        return stats;
    }
}
