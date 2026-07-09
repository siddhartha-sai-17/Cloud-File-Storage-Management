package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class UploadBufferPool {
    private static final Logger logger = LoggerFactory.getLogger(UploadBufferPool.class);

    private final UploadConfig uploadConfig;
    private final ConcurrentLinkedQueue<byte[]> pool = new ConcurrentLinkedQueue<>();
    private final AtomicInteger activeAllocations = new AtomicInteger(0);
    private final int bufferSize;
    private final int maxPoolSize;
    private final boolean enabled;

    public UploadBufferPool(UploadConfig uploadConfig) {
        this.uploadConfig = uploadConfig;
        this.bufferSize = uploadConfig.getPerformanceBufferSize();
        this.maxPoolSize = uploadConfig.getPerformanceBufferPoolSize();
        this.enabled = uploadConfig.isPerformanceEnableBufferPooling();

        if (enabled) {
            logger.info("Initializing UploadBufferPool with maxPoolSize={}, bufferSize={}", maxPoolSize, bufferSize);
            for (int i = 0; i < maxPoolSize; i++) {
                pool.offer(new byte[bufferSize]);
            }
        }
    }

    public byte[] borrowBuffer() {
        if (!enabled) {
            return new byte[bufferSize];
        }
        byte[] buffer = pool.poll();
        if (buffer == null) {
            logger.warn("UploadBufferPool exhausted. Dynamically allocating fallback buffer of size {}", bufferSize);
            activeAllocations.incrementAndGet();
            return new byte[bufferSize];
        }
        return buffer;
    }

    public void returnBuffer(byte[] buffer) {
        if (!enabled || buffer == null || buffer.length != bufferSize) {
            return;
        }
        if (pool.contains(buffer)) {
            logger.warn("Prevented duplicate return of buffer to pool.");
            return;
        }

        if (pool.size() < maxPoolSize) {
            pool.offer(buffer);
        } else {
            activeAllocations.decrementAndGet();
        }
    }

    public int getPoolSize() {
        return pool.size();
    }

    public int getActiveAllocations() {
        return activeAllocations.get();
    }
}
