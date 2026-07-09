package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.entity.WorkspaceMember;
import com.cloudstorage.backend.entity.WorkspaceMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

    List<WorkspaceMember> findByWorkspace(Workspace workspace);

    List<WorkspaceMember> findByUser(User user);

    Optional<WorkspaceMember> findByWorkspaceAndUser(Workspace workspace, User user);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    boolean existsByWorkspaceAndUser(Workspace workspace, User user);

    boolean existsByWorkspaceAndUserAndStatus(Workspace workspace, User user, WorkspaceMemberStatus status);

    int countByWorkspace(Workspace workspace);
}
