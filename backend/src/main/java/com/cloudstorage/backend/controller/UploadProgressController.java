package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.UploadProgressDto;
import com.cloudstorage.backend.service.UploadProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
@Tag(name = "Upload Progress", description = "API endpoints for tracking real-time upload progress and metrics")
public class UploadProgressController {

    private final UploadProgressService uploadProgressService;

    @GetMapping("/session/{sessionId}/progress")
    @Operation(summary = "Get Session Upload Progress", description = "Returns real-time or last-persisted progress for an upload session.")
    public ResponseEntity<UploadProgressDto> getProgress(@PathVariable String sessionId) {
        UploadProgressDto dto = uploadProgressService.getProgress(sessionId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/session/{sessionId}/statistics")
    @Operation(summary = "Get Session Statistics", description = "Returns detailed speed, performance, and transfer metrics for a session.")
    public ResponseEntity<Map<String, Object>> getStatistics(@PathVariable String sessionId) {
        UploadProgressDto dto = uploadProgressService.getProgress(sessionId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        // Expose a clean structured stats map
        Map<String, Object> stats = Map.of(
                "sessionId", sessionId,
                "currentSpeedBps", dto.getCurrentSpeedBps(),
                "averageSpeedBps", dto.getAverageSpeedBps(),
                "peakSpeedBps", dto.getPeakSpeedBps(),
                "etaSeconds", dto.getEtaSeconds(),
                "uploadPercentage", dto.getUploadPercentage(),
                "uploadedBytes", dto.getUploadedBytes(),
                "fileSize", dto.getFileSize(),
                "status", dto.getStatus()
        );
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/progress/active")
    @Operation(summary = "Get Active Upload Progresses", description = "Returns progress information for all active, in-flight upload sessions.")
    public ResponseEntity<List<UploadProgressDto>> getActiveProgress() {
        return ResponseEntity.ok(uploadProgressService.getAllActiveProgress());
    }

    @GetMapping("/progress/history")
    @Operation(summary = "Get Completed Upload History", description = "Returns a paginated list of completed upload sessions and final stats.")
    public ResponseEntity<List<UploadProgressDto>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(uploadProgressService.getHistory(page, size));
    }
}
