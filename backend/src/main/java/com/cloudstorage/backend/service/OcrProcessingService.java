package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.OcrStatistics;

public interface OcrProcessingService {

    void queueOcrJob(Long fileId);

    void processFileOcr(Long fileId); // Triggers background thread processing

    String getOcrStatus(Long fileId);

    OcrStatistics getStatistics();

    void reindexFile(Long fileId);

    void reindexAll();
}
