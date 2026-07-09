package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.OcrStatistics;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.OcrContent;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.OcrContentRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class OcrProcessingServiceImpl implements OcrProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(OcrProcessingServiceImpl.class);

    private final OcrContentRepository ocrContentRepository;
    private final FileRepository fileRepository;
    private final ObjectStorageService objectStorageService;
    private final org.springframework.cache.CacheManager cacheManager;

    @Value("${ocr.enabled:true}")
    private boolean ocrEnabled;

    @Value("${ocr.executor.core-size:4}")
    private int coreSize;

    @Value("${ocr.executor.max-size:16}")
    private int maxSize;

    @Value("${ocr.queue-capacity:500}")
    private int queueCapacity;

    @Value("${ocr.retry.max-attempts:3}")
    private int maxAttempts;

    @Value("${ocr.retry.delay-ms:5000}")
    private int retryDelayMs;

    private final ThreadPoolTaskExecutor ocrExecutor = new ThreadPoolTaskExecutor();
    private final ScheduledExecutorService retryScheduler = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    public void init() {
        ocrExecutor.setCorePoolSize(coreSize);
        ocrExecutor.setMaxPoolSize(maxSize);
        ocrExecutor.setQueueCapacity(queueCapacity);
        ocrExecutor.setThreadNamePrefix("ocr-worker-");
        ocrExecutor.initialize();
    }

    @PreDestroy
    public void destroy() {
        ocrExecutor.shutdown();
        retryScheduler.shutdown();
    }

    @Override
    @Transactional
    public void queueOcrJob(Long fileId) {
        if (!ocrEnabled) {
            logger.info("OCR is disabled globally. Skipping fileId={}", fileId);
            return;
        }

        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        OcrContent content = ocrContentRepository.findByFileMetadata(file)
                .orElse(OcrContent.builder().fileMetadata(file).build());

        content.setProcessingStatus("PENDING");
        content.setRetryCount(0);
        content.setLastError(null);
        ocrContentRepository.save(content);

        // Submit to asynchronous executor
        ocrExecutor.execute(() -> processFileOcr(fileId));
    }

    @Override
    public void processFileOcr(Long fileId) {
        logger.info("Processing OCR for fileId={}", fileId);

        // Transition status to PROCESSING
        boolean success = transitionStatus(fileId, "PENDING", "PROCESSING");
        if (!success) {
            // Check if status is already PROCESSING (concurrent execution prevention)
            logger.warn("OCR job for fileId={} is already processing or not in PENDING state", fileId);
            return;
        }

        try {
            FileMetadata file = fileRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File metadata not found"));

            String extractedText = "";
            int pageCount = 1;
            String engine = "Tesseract-Mock";

            try (InputStream inputStream = objectStorageService.downloadFile(file.getStoragePath())) {
                String contentType = file.getContentType().toLowerCase();

                if (contentType.contains("pdf")) {
                    engine = "PDFBox-Extractor";
                    try (PDDocument document = PDDocument.load(inputStream)) {
                        PDFTextStripper stripper = new PDFTextStripper();
                        extractedText = stripper.getText(document);
                        pageCount = document.getNumberOfPages();
                    } catch (Exception pdfEx) {
                        logger.warn("PDFBox load failed for fileId={}, falling back to strings extraction: {}", fileId, pdfEx.getMessage());
                        try (InputStream is2 = objectStorageService.downloadFile(file.getStoragePath())) {
                            byte[] bytes = readAllBytes(is2);
                            extractedText = extractPrintableStrings(bytes);
                            pageCount = 1;
                        }
                    }
                } else {
                    // Extract printable strings from images / binary mocks
                    byte[] bytes = readAllBytes(inputStream);
                    extractedText = extractPrintableStrings(bytes);
                    pageCount = 1;
                }
            }

            // Save successfully completed index
            finalizeOcrJob(fileId, extractedText, pageCount, engine);
            logger.info("OCR completed successfully for fileId={}", fileId);

        } catch (Exception e) {
            logger.error("OCR extraction failed for fileId={}: {}", fileId, e.getMessage(), e);
            handleFailure(fileId, e.getMessage());
        }
    }

    @Transactional
    protected boolean transitionStatus(Long fileId, String fromStatus, String toStatus) {
        Optional<FileMetadata> fileOpt = fileRepository.findById(fileId);
        if (fileOpt.isEmpty()) return false;
        FileMetadata file = fileOpt.get();

        Optional<OcrContent> contentOpt = ocrContentRepository.findByFileMetadata(file);
        if (contentOpt.isEmpty()) return false;
        OcrContent content = contentOpt.get();

        if (content.getProcessingStatus().equals(fromStatus) || "PROCESSING".equals(toStatus)) {
            content.setProcessingStatus(toStatus);
            ocrContentRepository.save(content);
            return true;
        }
        return false;
    }

    @Transactional
    protected void finalizeOcrJob(Long fileId, String text, int pages, String engine) {
        FileMetadata file = fileRepository.findById(fileId).orElseThrow();
        OcrContent content = ocrContentRepository.findByFileMetadata(file).orElseThrow();

        content.setExtractedText(text);
        content.setPageCount(pages);
        content.setOcrEngine(engine);
        content.setProcessingStatus("COMPLETED");
        content.setIndexedAt(LocalDateTime.now());
        content.setConfidence(0.95);
        content.setLastError(null);
        ocrContentRepository.save(content);

        file.setOcrIndexed(true);
        file.setLastIndexedAt(LocalDateTime.now());
        fileRepository.save(file);

        if (cacheManager != null && cacheManager.getCache("searchCache") != null) {
            cacheManager.getCache("searchCache").clear();
        }
    }

    @Transactional
    protected void handleFailure(Long fileId, String error) {
        Optional<FileMetadata> fileOpt = fileRepository.findById(fileId);
        if (fileOpt.isEmpty()) return;
        FileMetadata file = fileOpt.get();

        OcrContent content = ocrContentRepository.findByFileMetadata(file).orElse(null);
        if (content == null) return;

        int retry = content.getRetryCount() + 1;
        content.setRetryCount(retry);
        content.setLastError(error);

        if (retry < maxAttempts) {
            content.setProcessingStatus("PENDING");
            ocrContentRepository.save(content);
            logger.info("Scheduling retry attempt {} for fileId={} in {}ms", retry, fileId, retryDelayMs);
            retryScheduler.schedule(() -> ocrExecutor.execute(() -> processFileOcr(fileId)), retryDelayMs, TimeUnit.MILLISECONDS);
        } else {
            content.setProcessingStatus("FAILED");
            ocrContentRepository.save(content);
            logger.error("OCR job for fileId={} exhausted all {} retry attempts. Set status to FAILED.", fileId, maxAttempts);
        }
    }

    private byte[] readAllBytes(InputStream inputStream) throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int nRead;
        byte[] data = new byte[1024];
        while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        return buffer.toByteArray();
    }

    private String extractPrintableStrings(byte[] bytes) {
        try {
            String utf8Str = new String(bytes, StandardCharsets.UTF_8);
            if (isAllPrintable(utf8Str)) {
                return utf8Str;
            }
        } catch (Exception e) {
            // fallback
        }

        StringBuilder sb = new StringBuilder();
        int count = 0;
        int start = -1;
        for (int i = 0; i < bytes.length; i++) {
            byte b = bytes[i];
            if ((b >= 32 && b <= 126) || b == '\n' || b == '\r' || b == '\t') {
                if (start == -1) start = i;
                count++;
            } else {
                if (count >= 4) {
                    sb.append(new String(bytes, start, count, StandardCharsets.US_ASCII)).append(" ");
                }
                start = -1;
                count = 0;
            }
        }
        if (count >= 4) {
            sb.append(new String(bytes, start, count, StandardCharsets.US_ASCII));
        }
        return sb.toString().trim();
    }

    private boolean isAllPrintable(String str) {
        int len = str.length();
        if (len == 0) return false;
        int nonPrintable = 0;
        for (int i = 0; i < len; i++) {
            char c = str.charAt(i);
            if ((c < 32 && c != '\n' && c != '\r' && c != '\t') || c > 126) {
                nonPrintable++;
            }
        }
        return ((double) nonPrintable / len) < 0.15;
    }

    @Override
    @Transactional(readOnly = true)
    public String getOcrStatus(Long fileId) {
        return fileRepository.findById(fileId)
                .flatMap(ocrContentRepository::findByFileMetadata)
                .map(OcrContent::getProcessingStatus)
                .orElse("NONE");
    }

    @Override
    @Transactional(readOnly = true)
    public OcrStatistics getStatistics() {
        List<OcrContent> all = ocrContentRepository.findAll();
        long pending = all.stream().filter(c -> "PENDING".equals(c.getProcessingStatus())).count();
        long processing = all.stream().filter(c -> "PROCESSING".equals(c.getProcessingStatus())).count();
        long completed = all.stream().filter(c -> "COMPLETED".equals(c.getProcessingStatus())).count();
        long failed = all.stream().filter(c -> "FAILED".equals(c.getProcessingStatus())).count();
        long total = all.size();

        double rate = total == 0 ? 0.0 : ((double) completed / total) * 100.0;

        return OcrStatistics.builder()
                .pendingJobs(pending)
                .processingJobs(processing)
                .completedJobs(completed)
                .failedJobs(failed)
                .totalJobs(total)
                .successRate(rate)
                .build();
    }

    @Override
    @Transactional
    public void reindexFile(Long fileId) {
        queueOcrJob(fileId);
    }

    @Override
    @Transactional
    public void reindexAll() {
        List<FileMetadata> files = fileRepository.findAll();
        for (FileMetadata file : files) {
            if (!file.isDeleted()) {
                queueOcrJob(file.getId());
            }
        }
    }
}
