package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.QueuedUploadTask;
import com.cloudstorage.backend.dto.UploadQueueStatusDto;
import com.cloudstorage.backend.entity.UploadPriority;
import com.cloudstorage.backend.service.UploadQueueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads/queue")
@RequiredArgsConstructor
@Tag(name = "Upload Queue", description = "API endpoints for upload queue management and priority scheduling")
public class UploadQueueController {

    private final UploadQueueService uploadQueueService;

    @PostMapping("/enqueue/{sessionId}")
    @Operation(summary = "Enqueue Upload Session",
            description = "Adds an upload session to the priority queue for processing.")
    public ResponseEntity<QueuedUploadTask> enqueueSession(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "NORMAL") UploadPriority priority,
            @RequestParam(required = false) String clientUploadId,
            @RequestParam(required = false) String filename,
            @RequestParam(required = false) Long fileSize) {
        QueuedUploadTask task = uploadQueueService.enqueue(
                sessionId, userDetails.getUsername(), priority,
                clientUploadId, filename, fileSize);
        return ResponseEntity.ok(task);
    }

    @PostMapping("/dequeue")
    @Operation(summary = "Dequeue Next Upload",
            description = "Dequeues the highest-priority upload session for execution.")
    public ResponseEntity<QueuedUploadTask> dequeueNext() {
        return uploadQueueService.dequeue()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/complete/{sessionId}")
    @Operation(summary = "Mark Upload Complete",
            description = "Marks an upload session as completed, removing it from active tasks.")
    public ResponseEntity<Void> completeSession(@PathVariable String sessionId) {
        uploadQueueService.complete(sessionId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/cancel/{sessionId}")
    @Operation(summary = "Cancel Queued Upload",
            description = "Cancels and removes an upload session from the queue.")
    public ResponseEntity<Map<String, Boolean>> cancelSession(@PathVariable String sessionId) {
        boolean cancelled = uploadQueueService.cancel(sessionId);
        return ResponseEntity.ok(Map.of("cancelled", cancelled));
    }

    @PostMapping("/promote/{sessionId}")
    @Operation(summary = "Promote Upload Priority",
            description = "Promotes a queued upload session to HIGH priority to prevent starvation.")
    public ResponseEntity<Map<String, Boolean>> promoteSession(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionId) {
        boolean promoted = uploadQueueService.promote(sessionId);
        return ResponseEntity.ok(Map.of("promoted", promoted));
    }

    @GetMapping("/status/{sessionId}")
    @Operation(summary = "Get Queue Status",
            description = "Returns queue position, priority, and wait time for a specific session.")
    public ResponseEntity<UploadQueueStatusDto> getQueueStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "Upload session ID", required = true) @PathVariable String sessionId) {
        return ResponseEntity.ok(uploadQueueService.getStatus(sessionId));
    }

    @GetMapping("/all")
    @Operation(summary = "List All Queued Uploads",
            description = "Returns all upload sessions currently queued, sorted by priority.")
    public ResponseEntity<List<UploadQueueStatusDto>> getAllQueued() {
        return ResponseEntity.ok(uploadQueueService.getAllQueued());
    }

    @GetMapping("/stats")
    @Operation(summary = "Get Queue Statistics",
            description = "Exposes queue depth, active counts, and priority breakdowns.")
    public ResponseEntity<Map<String, Object>> getQueueStats() {
        return ResponseEntity.ok(uploadQueueService.getStats());
    }
}
