package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.WorkspaceRole;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RoleHierarchyService {

    private final Map<WorkspaceRole, Set<String>> rolePermissions = new EnumMap<>(WorkspaceRole.class);

    public RoleHierarchyService() {
        // GUEST
        rolePermissions.put(WorkspaceRole.GUEST, Set.of("FILE_READ", "SEARCH_VIEW"));

        // VIEWER
        Set<String> viewerPerms = new HashSet<>(rolePermissions.get(WorkspaceRole.GUEST));
        viewerPerms.add("OCR_VIEW");
        rolePermissions.put(WorkspaceRole.VIEWER, viewerPerms);

        // EDITOR
        Set<String> editorPerms = new HashSet<>(rolePermissions.get(WorkspaceRole.VIEWER));
        editorPerms.addAll(Set.of("FILE_WRITE", "FILE_VERSION", "FILE_RESTORE", "UPLOAD_CREATE", "UPLOAD_CANCEL"));
        rolePermissions.put(WorkspaceRole.EDITOR, editorPerms);

        // MANAGER
        Set<String> managerPerms = new HashSet<>(rolePermissions.get(WorkspaceRole.EDITOR));
        managerPerms.addAll(Set.of("FILE_DELETE", "FILE_SHARE", "TEAM_INVITE", "TEAM_REMOVE"));
        rolePermissions.put(WorkspaceRole.MANAGER, managerPerms);

        // WORKSPACE_OWNER
        Set<String> ownerPerms = new HashSet<>(rolePermissions.get(WorkspaceRole.MANAGER));
        ownerPerms.addAll(Set.of("TEAM_EDIT", "WORKSPACE_ADMIN"));
        rolePermissions.put(WorkspaceRole.WORKSPACE_OWNER, ownerPerms);

        // SYSTEM_ADMIN
        Set<String> adminPerms = new HashSet<>(rolePermissions.get(WorkspaceRole.WORKSPACE_OWNER));
        rolePermissions.put(WorkspaceRole.SYSTEM_ADMIN, adminPerms);
    }

    public boolean hasPermission(WorkspaceRole role, String permission) {
        if (role == WorkspaceRole.SYSTEM_ADMIN) {
            return true;
        }
        Set<String> perms = rolePermissions.get(role);
        return perms != null && perms.contains(permission);
    }
}
