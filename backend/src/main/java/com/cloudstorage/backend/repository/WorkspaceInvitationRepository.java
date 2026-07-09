package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.InvitationStatus;
import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.entity.WorkspaceInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceInvitationRepository extends JpaRepository<WorkspaceInvitation, Long> {

    List<WorkspaceInvitation> findByWorkspace(Workspace workspace);

    Optional<WorkspaceInvitation> findByToken(String token);

    boolean existsByWorkspaceAndEmailAndStatus(Workspace workspace, String email, InvitationStatus status);

    @Modifying
    @Query("UPDATE WorkspaceInvitation wi SET wi.status = :newStatus WHERE wi.expiresAt < :now AND wi.status = :oldStatus")
    int expireInvitationsBefore(@Param("now") LocalDateTime now, @Param("oldStatus") InvitationStatus oldStatus, @Param("newStatus") InvitationStatus newStatus);

    @Modifying
    @Query("DELETE FROM WorkspaceInvitation wi WHERE wi.expiresAt < :now")
    int deleteExpiredInvitations(@Param("now") LocalDateTime now);
}
