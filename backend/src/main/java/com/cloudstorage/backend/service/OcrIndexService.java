package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.OcrContent;

public interface OcrIndexService {

    OcrContent saveIndex(FileMetadata file, String text, String language, int pages, double confidence, String engine);

    void deleteIndex(FileMetadata file);

    OcrContent getIndex(FileMetadata file);

    void clearAll();
}
