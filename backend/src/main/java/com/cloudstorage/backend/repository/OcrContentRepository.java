package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.OcrContent;
import com.cloudstorage.backend.entity.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface OcrContentRepository extends JpaRepository<OcrContent, Long> {

    Optional<OcrContent> findByFileMetadata(FileMetadata fileMetadata);

    List<OcrContent> findByExtractedTextContaining(String keyword);

    void deleteByFileMetadata(FileMetadata fileMetadata);

    @Query("SELECT o FROM OcrContent o WHERE o.fileMetadata.user.username = :username AND o.extractedText LIKE %:text% AND o.fileMetadata.deleted = false")
    List<OcrContent> searchByUserAndText(@Param("username") String username, @Param("text") String text);

    @Query("SELECT o FROM OcrContent o WHERE o.extractedText LIKE %:text% AND o.fileMetadata.deleted = false")
    List<OcrContent> searchAllAndText(@Param("text") String text);
}
