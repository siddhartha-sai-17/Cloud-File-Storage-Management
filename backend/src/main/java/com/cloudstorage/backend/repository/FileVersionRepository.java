package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.FileVersion;
import com.cloudstorage.backend.entity.FileMetadata;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FileVersionRepository extends JpaRepository<FileVersion, Long> {

    List<FileVersion> findByFileMetadataOrderByVersionNumberDesc(FileMetadata fileMetadata);

    Optional<FileVersion> findByFileMetadataAndVersionNumber(FileMetadata fileMetadata, Integer versionNumber);

    Page<FileVersion> findByFileMetadata(FileMetadata fileMetadata, Pageable pageable);

    @Query("SELECT v FROM FileVersion v WHERE v.fileMetadata = :fileMetadata AND " +
           "(:uploadedBy IS NULL OR v.uploadedBy = :uploadedBy) AND " +
           "(:contentType IS NULL OR v.contentType = :contentType)")
    Page<FileVersion> filterVersions(
            @Param("fileMetadata") FileMetadata fileMetadata,
            @Param("uploadedBy") String uploadedBy,
            @Param("contentType") String contentType,
            Pageable pageable
    );

    long countBySha256(String sha256);

    @Modifying
    @Query("UPDATE FileVersion v SET v.currentVersion = false WHERE v.fileMetadata.id = :fileId")
    void demoteCurrentVersions(@Param("fileId") Long fileId);
}
