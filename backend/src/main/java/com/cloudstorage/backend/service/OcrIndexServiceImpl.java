package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.OcrContent;
import com.cloudstorage.backend.repository.OcrContentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OcrIndexServiceImpl implements OcrIndexService {

    private final OcrContentRepository ocrContentRepository;

    @Override
    @Transactional
    public OcrContent saveIndex(FileMetadata file, String text, String language, int pages, double confidence, String engine) {
        OcrContent content = ocrContentRepository.findByFileMetadata(file)
                .orElse(OcrContent.builder().fileMetadata(file).build());

        content.setExtractedText(text);
        content.setLanguage(language);
        content.setPageCount(pages);
        content.setIndexedAt(LocalDateTime.now());
        content.setOcrEngine(engine);
        content.setProcessingStatus("COMPLETED");
        content.setConfidence(confidence);

        return ocrContentRepository.save(content);
    }

    @Override
    @Transactional
    public void deleteIndex(FileMetadata file) {
        ocrContentRepository.deleteByFileMetadata(file);
    }

    @Override
    @Transactional(readOnly = true)
    public OcrContent getIndex(FileMetadata file) {
        return ocrContentRepository.findByFileMetadata(file).orElse(null);
    }

    @Override
    @Transactional
    public void clearAll() {
        ocrContentRepository.deleteAll();
    }
}
