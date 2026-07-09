package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.PreviewDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.repository.FileRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PreviewServiceImpl implements PreviewService {

    private final FileRepository fileRepository;
    private final ObjectStorageService objectStorageService;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "filePreviews", key = "#fileId")
    public PreviewDto getPreview(String username, Long fileId) {
        authorizationService.checkFilePermission(username, fileId, "READ");

        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        if (file.isDeleted()) {
            throw new RuntimeException("Cannot preview a deleted file");
        }

        Map<String, String> metadata = new HashMap<>();
        metadata.put("category", file.getCategory() != null ? file.getCategory() : "UNKNOWN");
        metadata.put("classification", file.getClassification() != null ? file.getClassification() : "UNCLASSIFIED");
        metadata.put("uploadDate", file.getUploadDate() != null ? file.getUploadDate().toString() : "");

        String previewText = null;
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        try {
            if (contentType.startsWith("text/") || contentType.equals("application/json") || contentType.equals("application/xml") || file.getFilename().endsWith(".md")) {
                // Text or Markdown preview: read first 2KB
                try (InputStream is = objectStorageService.downloadFile(file.getStoragePath())) {
                    if (is != null) {
                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        byte[] buffer = new byte[1024];
                        int bytesRead;
                        int totalRead = 0;
                        while ((bytesRead = is.read(buffer)) != -1 && totalRead < 2048) {
                            bos.write(buffer, 0, bytesRead);
                            totalRead += bytesRead;
                        }
                        previewText = bos.toString(StandardCharsets.UTF_8);
                    }
                }
            } else if (contentType.equals("application/pdf")) {
                // PDF preview using Apache PDFBox
                try (InputStream is = objectStorageService.downloadFile(file.getStoragePath())) {
                    if (is != null) {
                        try (PDDocument document = PDDocument.load(is)) {
                            PDDocumentInformation info = document.getDocumentInformation();
                            if (info != null) {
                                metadata.put("title", info.getTitle() != null ? info.getTitle() : "");
                                metadata.put("author", info.getAuthor() != null ? info.getAuthor() : "");
                                metadata.put("subject", info.getSubject() != null ? info.getSubject() : "");
                                metadata.put("creator", info.getCreator() != null ? info.getCreator() : "");
                                metadata.put("producer", info.getProducer() != null ? info.getProducer() : "");
                            }
                            metadata.put("pageCount", String.valueOf(document.getNumberOfPages()));
                            previewText = "PDF Document: " + document.getNumberOfPages() + " pages.";
                        }
                    }
                }
            } else if (contentType.startsWith("image/")) {
                // Image metadata (placeholder thumbnail)
                metadata.put("dimensions", "Unknown");
                previewText = "Image File: " + file.getFilename();
            } else if (contentType.contains("officedocument") || contentType.contains("msword") || contentType.contains("excel") || contentType.contains("powerpoint")) {
                // Office preview metadata
                metadata.put("officeDocumentType", contentType);
                previewText = "Office Document: " + file.getFilename();
            }
        } catch (Exception e) {
            // Log and fallback to basic metadata
            metadata.put("preview_error", e.getMessage());
        }

        // Thumbnail URL fallback (metadata-based URL)
        String thumbnailUrl = "/api/files/" + fileId + "/thumbnail";

        return PreviewDto.builder()
                .fileId(fileId)
                .filename(file.getFilename())
                .contentType(contentType)
                .size(file.getSize())
                .contentPreview(previewText)
                .thumbnailUrl(thumbnailUrl)
                .metadata(metadata)
                .build();
    }
}
