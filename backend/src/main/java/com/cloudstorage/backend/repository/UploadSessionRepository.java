package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.UploadSession;
import com.cloudstorage.backend.entity.UploadSessionStatus;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UploadSessionRepository extends JpaRepository<UploadSession, String> {

    Optional<UploadSession> findByClientUploadIdAndUser(String clientUploadId, User user);

    List<UploadSession> findByUserAndWorkspaceIdIsNull(User user);


    List<UploadSession> findByStatus(UploadSessionStatus status);

    List<UploadSession> findByExpiresAtBefore(LocalDateTime time);

    boolean existsByClientUploadIdAndUserAndStatusIn(String clientUploadId, User user, List<UploadSessionStatus> statuses);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM UploadSession s JOIN FETCH s.user WHERE s.id = :id")
    Optional<UploadSession> findByIdWithUser(@org.springframework.data.repository.query.Param("id") String id);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE UploadSession s SET " +
            "s.uploadedBytes = :uploadedBytes, " +
            "s.uploadedChunks = :uploadedChunks, " +
            "s.uploadPercentage = :uploadPercentage, " +
            "s.currentSpeedBps = :currentSpeedBps, " +
            "s.averageSpeedBps = :averageSpeedBps, " +
            "s.peakSpeedBps = :peakSpeedBps, " +
            "s.etaSeconds = :etaSeconds, " +
            "s.progressVersion = :progressVersion, " +
            "s.lastProgressUpdate = :lastProgressUpdate, " +
            "s.lastChunkCompleted = :lastChunkCompleted " +
            "WHERE s.id = :id AND (:progressVersion >= s.progressVersion OR s.progressVersion IS NULL)")
    int updateProgressFields(
            @org.springframework.data.repository.query.Param("id") String id,
            @org.springframework.data.repository.query.Param("uploadedBytes") Long uploadedBytes,
            @org.springframework.data.repository.query.Param("uploadedChunks") Integer uploadedChunks,
            @org.springframework.data.repository.query.Param("uploadPercentage") Double uploadPercentage,
            @org.springframework.data.repository.query.Param("currentSpeedBps") Long currentSpeedBps,
            @org.springframework.data.repository.query.Param("averageSpeedBps") Long averageSpeedBps,
            @org.springframework.data.repository.query.Param("peakSpeedBps") Long peakSpeedBps,
            @org.springframework.data.repository.query.Param("etaSeconds") Long etaSeconds,
            @org.springframework.data.repository.query.Param("progressVersion") Long progressVersion,
            @org.springframework.data.repository.query.Param("lastProgressUpdate") LocalDateTime lastProgressUpdate,
            @org.springframework.data.repository.query.Param("lastChunkCompleted") LocalDateTime lastChunkCompleted
    );

    @org.springframework.data.jpa.repository.Query("SELECT s FROM UploadSession s JOIN FETCH s.user WHERE " +
            "(:username IS NULL OR s.user.username = :username) AND " +
            "(:status IS NULL OR s.status = :status) AND " +
            "(:sessionId IS NULL OR s.id = :sessionId) AND " +
            "(cast(:startDate as timestamp) IS NULL OR s.createdAt >= :startDate) AND " +
            "(cast(:endDate as timestamp) IS NULL OR s.createdAt <= :endDate)")
    org.springframework.data.domain.Page<UploadSession> filterSessions(
            @org.springframework.data.repository.query.Param("username") String username,
            @org.springframework.data.repository.query.Param("status") com.cloudstorage.backend.entity.UploadSessionStatus status,
            @org.springframework.data.repository.query.Param("sessionId") String sessionId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDateTime endDate,
            org.springframework.data.domain.Pageable pageable
    );

    @org.springframework.data.jpa.repository.Query("SELECT s.id FROM UploadSession s WHERE s.status IN :statuses AND s.createdAt < :threshold")
    List<String> findSessionIdsForCleanup(
            @org.springframework.data.repository.query.Param("statuses") List<com.cloudstorage.backend.entity.UploadSessionStatus> statuses,
            @org.springframework.data.repository.query.Param("threshold") java.time.LocalDateTime threshold
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM UploadSession s WHERE s.id IN :sessionIds")
    int deleteSessionByIds(@org.springframework.data.repository.query.Param("sessionIds") List<String> sessionIds);
}
