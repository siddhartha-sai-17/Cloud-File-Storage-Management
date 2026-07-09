package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.AccessOperation;
import com.cloudstorage.backend.entity.ShareAccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public interface ShareAccessLogRepository extends JpaRepository<ShareAccessLog, Long>, JpaSpecificationExecutor<ShareAccessLog> {

    Page<ShareAccessLog> findByShareLinkId(UUID shareLinkId, Pageable pageable);

    List<ShareAccessLog> findByShareLinkId(UUID shareLinkId);

    long countByShareLinkIdAndOperationAndStatus(UUID shareLinkId, AccessOperation operation, String status);

    @Query("SELECT COUNT(DISTINCT sal.ipAddress) FROM ShareAccessLog sal WHERE sal.shareLink.id = :shareLinkId AND sal.status = 'SUCCESS'")
    long countUniqueIpByShareLinkId(UUID shareLinkId);

    @Query("SELECT COUNT(DISTINCT sal.user.id) FROM ShareAccessLog sal WHERE sal.shareLink.id = :shareLinkId AND sal.user IS NOT NULL AND sal.status = 'SUCCESS'")
    long countUniqueUserByShareLinkId(UUID shareLinkId);

    @Query("SELECT sal.userAgent as userAgent, COUNT(sal.id) as count FROM ShareAccessLog sal WHERE sal.shareLink.id = :shareLinkId GROUP BY sal.userAgent")
    List<Map<String, Object>> countByUserAgent(UUID shareLinkId);

    @Query("SELECT sal.ipAddress as ipAddress, COUNT(sal.id) as count FROM ShareAccessLog sal WHERE sal.shareLink.id = :shareLinkId GROUP BY sal.ipAddress")
    List<Map<String, Object>> countByIpAddress(UUID shareLinkId);

    @Query("SELECT AVG(sal.shareLink.fileMetadata.size) FROM ShareAccessLog sal WHERE sal.shareLink.id = :shareLinkId AND sal.operation = 'DOWNLOAD' AND sal.status = 'SUCCESS'")
    Double getAverageDownloadSize(UUID shareLinkId);

    List<ShareAccessLog> findTop10ByShareLinkIdOrderByTimestampDesc(UUID shareLinkId);
}
