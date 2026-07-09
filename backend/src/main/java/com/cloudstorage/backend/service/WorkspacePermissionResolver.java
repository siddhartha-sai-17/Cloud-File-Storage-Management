package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkspacePermissionResolver {

    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RoleHierarchyService roleHierarchyService;

    public Optional<WorkspaceRole> resolveRole(Workspace workspace, User user) {
        if (workspace.getOwner().getId().equals(user.getId())) {
            return Optional.of(WorkspaceRole.WORKSPACE_OWNER);
        }
        return workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
                .map(WorkspaceMember::getRole);
    }

    public boolean hasPermission(Workspace workspace, User user, String permission) {
        if (user.isSysAdmin()) {
            return true;
        }
        Optional<WorkspaceRole> roleOpt = resolveRole(workspace, user);
        if (roleOpt.isEmpty()) {
            return false;
        }
        return roleHierarchyService.hasPermission(roleOpt.get(), permission);
    }
}
