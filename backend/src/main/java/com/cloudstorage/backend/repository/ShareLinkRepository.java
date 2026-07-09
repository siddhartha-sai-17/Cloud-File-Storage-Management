package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.ShareLink;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShareLinkRepository extends JpaRepository<ShareLink, UUID>, JpaSpecificationExecutor<ShareLink> {

    Optional<ShareLink> findByToken(String token);

    Page<ShareLink> findByCreatedBy(User user, Pageable pageable);

    List<ShareLink> findByCreatedBy(User user);

    List<ShareLink> findByFileMetadataId(Long fileId);

    List<ShareLink> findByWorkspaceId(Long workspaceId);

    @Query("SELECT s FROM ShareLink s WHERE s.active = true AND s.expiresAt IS NOT NULL AND s.expiresAt < :now")
    List<ShareLink> findExpiredLinks(LocalDateTime now);

    @Query("SELECT s FROM ShareLink s WHERE s.fileMetadata.id = :fileId AND s.active = true")
    List<ShareLink> findActiveByFileId(Long fileId);

    @Query("SELECT s FROM ShareLink s WHERE s.workspace.id = :workspaceId AND s.active = true")
    List<ShareLink> findActiveByWorkspaceId(Long workspaceId);
}
