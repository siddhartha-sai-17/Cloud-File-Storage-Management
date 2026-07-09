package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.UploadAuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface UploadAuditRepository extends JpaRepository<UploadAuditEvent, String> {

    @Query("SELECT a FROM UploadAuditEvent a WHERE " +
            "(:sessionId IS NULL OR a.sessionId = :sessionId) AND " +
            "(:username IS NULL OR a.username = :username) AND " +
            "(:eventType IS NULL OR a.eventType = :eventType) AND " +
            "(cast(:startDate as timestamp) IS NULL OR a.timestamp >= :startDate) AND " +
            "(cast(:endDate as timestamp) IS NULL OR a.timestamp <= :endDate)")
    Page<UploadAuditEvent> filterEvents(
            @Param("sessionId") String sessionId,
            @Param("username") String username,
            @Param("eventType") String eventType,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Modifying
    @Query("DELETE FROM UploadAuditEvent a WHERE a.timestamp < :threshold")
    int deleteOlderThan(@Param("threshold") LocalDateTime threshold);
}
