package com.cloudstorage.backend.service;

import java.io.InputStream;

public interface ObjectStorageService {
    void uploadFile(String objectName, InputStream stream, long size, String contentType);
    InputStream downloadFile(String objectName);
    void deleteFile(String objectName);
    boolean objectExists(String objectName);
}
