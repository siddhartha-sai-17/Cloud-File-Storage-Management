package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.FileVersion;
import com.cloudstorage.backend.entity.FileMetadata;
import org.springframework.data.domain.Page;
import java.io.InputStream;
import java.util.concurrent.locks.ReentrantLock;

public interface FileVersionService {

    ReentrantLock getFileLock(String username, Long folderId, String filename);

    FileVersion createNewVersion(
            FileMetadata file,
            String storagePath,
            String sha256,
            long size,
            String contentType,
            String category,
            Double confidence,
            String tags,
            String changeDescription,
            Integer restoredFromVersion,
            String username,
            boolean isNewFile
    );

    Page<FileVersion> getVersionHistory(
            String username,
            Long fileId,
            int page,
            int size,
            String sortBy,
            String direction,
            String uploadedBy,
            String contentType
    );

    FileVersion getVersionMetadata(String username, Long fileId, Long versionId);

    FileVersion restoreVersion(String username, Long fileId, Long versionId);

    void deleteVersion(String username, Long fileId, Long versionId);

    FileVersion getCurrentVersion(String username, Long fileId);

    InputStream downloadVersion(String username, Long fileId, Long versionId);
}
