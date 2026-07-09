package com.cloudstorage.backend.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class MetricsService {

    private final Timer uploadTimer;
    private final Timer downloadTimer;
    private final Timer ocrTimer;
    private final Timer searchTimer;
    private final Counter shareAccessCounter;
    private final Counter workspaceActivityCounter;

    public MetricsService(MeterRegistry registry) {
        this.uploadTimer = Timer.builder("cloudstorage.uploads.duration")
                .description("Time taken to upload and merge files")
                .register(registry);

        this.downloadTimer = Timer.builder("cloudstorage.downloads.duration")
                .description("Time taken to stream file downloads")
                .register(registry);

        this.ocrTimer = Timer.builder("cloudstorage.ocr.duration")
                .description("Time taken to run OCR processing")
                .register(registry);

        this.searchTimer = Timer.builder("cloudstorage.search.latency")
                .description("Search query execution latency")
                .register(registry);

        this.shareAccessCounter = Counter.builder("cloudstorage.shares.access")
                .description("Number of share link access events")
                .register(registry);

        this.workspaceActivityCounter = Counter.builder("cloudstorage.workspaces.activity")
                .description("Number of workspace operations recorded")
                .register(registry);
    }

    public void recordUpload(long durationMs) {
        uploadTimer.record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void recordDownload(long durationMs) {
        downloadTimer.record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void recordOcr(long durationMs) {
        ocrTimer.record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void recordSearch(long durationMs) {
        searchTimer.record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void incrementShareAccess() {
        shareAccessCounter.increment();
    }

    public void incrementWorkspaceActivity() {
        workspaceActivityCounter.increment();
    }
}
