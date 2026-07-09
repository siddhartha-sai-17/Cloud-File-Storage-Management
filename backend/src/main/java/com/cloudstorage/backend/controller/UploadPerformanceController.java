package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.UploadPerformanceSnapshot;
import com.cloudstorage.backend.dto.UploadPerformanceSummaryDto;
import com.cloudstorage.backend.service.UploadPerformanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/uploads/performance")
@RequiredArgsConstructor
public class UploadPerformanceController {

    private final UploadPerformanceService uploadPerformanceService;

    @GetMapping
    public ResponseEntity<UploadPerformanceSummaryDto> getPerformanceSummary() {
        return ResponseEntity.ok(uploadPerformanceService.getAggregatedPerformance());
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<UploadPerformanceSnapshot> getSessionPerformance(@PathVariable String sessionId) {
        UploadPerformanceSnapshot snapshot = uploadPerformanceService.getSnapshot(sessionId);
        if (snapshot == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(snapshot);
    }
}
