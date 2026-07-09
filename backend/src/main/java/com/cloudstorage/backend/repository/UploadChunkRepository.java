package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.UploadedChunk;
import com.cloudstorage.backend.entity.UploadSession;
import com.cloudstorage.backend.entity.ChunkStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadChunkRepository extends JpaRepository<UploadedChunk, Long> {

    List<UploadedChunk> findByUploadSessionOrderByChunkNumber(UploadSession session);

    List<UploadedChunk> findByStatus(ChunkStatus status);

    boolean existsByUploadSession(UploadSession session);

    boolean existsByUploadSessionAndChunkNumber(UploadSession session, Integer chunkNumber);

    boolean existsByUploadSessionIdAndChunkNumber(String sessionId, Integer chunkNumber);

    Optional<UploadedChunk> findByUploadSessionAndChunkNumber(UploadSession session, Integer chunkNumber);

    long countByUploadSession(UploadSession session);

    long countByUploadSessionAndStatus(UploadSession session, ChunkStatus status);

    void deleteByUploadSession(UploadSession session);

    @Query("SELECT COALESCE(SUM(c.chunkSize), 0) FROM UploadedChunk c WHERE c.uploadSession = :session")
    Long sumUploadedBytesByUploadSession(@Param("session") UploadSession session);

    // Helper queries for future recovery and upload completion milestones
    @Query("SELECT c FROM UploadedChunk c WHERE c.uploadSession = :session AND c.status <> :status")
    List<UploadedChunk> findByUploadSessionAndStatusNot(@Param("session") UploadSession session, @Param("status") ChunkStatus status);

    @Query("SELECT c FROM UploadedChunk c WHERE c.uploadSession = :session ORDER BY c.chunkNumber DESC")
    List<UploadedChunk> findLatestUploadedChunk(@Param("session") UploadSession session);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM UploadedChunk c WHERE c.uploadSession.id IN :sessionIds")
    int deleteBySessionIds(@Param("sessionIds") List<String> sessionIds);
}
