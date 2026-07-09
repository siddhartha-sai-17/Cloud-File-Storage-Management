package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.OcrStatistics;
import com.cloudstorage.backend.service.OcrProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrProcessingService ocrProcessingService;

    @PostMapping("/reindex/{fileId}")
    public ResponseEntity<Map<String, String>> reindexFile(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        ocrProcessingService.reindexFile(fileId);
        return ResponseEntity.ok(Map.of("message", "Reindexing queued for fileId=" + fileId));
    }

    @PostMapping("/reindex/all")
    public ResponseEntity<Map<String, String>> reindexAll(@AuthenticationPrincipal UserDetails userDetails) {
        ocrProcessingService.reindexAll();
        return ResponseEntity.ok(Map.of("message", "Reindexing queued for all files"));
    }

    @GetMapping("/status/{fileId}")
    public ResponseEntity<Map<String, String>> getStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        String status = ocrProcessingService.getOcrStatus(fileId);
        return ResponseEntity.ok(Map.of("status", status));
    }

    @GetMapping("/statistics")
    public ResponseEntity<OcrStatistics> getStatistics(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ocrProcessingService.getStatistics());
    }
}
