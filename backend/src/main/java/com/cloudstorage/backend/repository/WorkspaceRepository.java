package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.entity.WorkspaceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    List<Workspace> findByOwner(User owner);

    Optional<Workspace> findByOwnerAndWorkspaceType(User owner, WorkspaceType workspaceType);

    @Query("SELECT w FROM Workspace w JOIN WorkspaceMember wm ON wm.workspace = w WHERE wm.user = :user AND wm.status = 'ACTIVE'")
    List<Workspace> findWorkspacesUserIsMemberOf(@Param("user") User user);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Workspace w WHERE w.id = :id")
    Optional<Workspace> findByIdForUpdate(@Param("id") Long id);
}

