package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import java.util.List;

public interface WorkspaceService {
    WorkspaceDto createWorkspace(String username, WorkspaceDto.CreateRequest request);
    WorkspaceDto updateWorkspace(String username, Long workspaceId, WorkspaceDto.UpdateRequest request);
    void deleteWorkspace(String username, Long workspaceId);
    WorkspaceDto transferOwnership(String username, Long workspaceId, WorkspaceDto.TransferRequest request);
    WorkspaceDto archiveWorkspace(String username, Long workspaceId);
    WorkspaceDto restoreWorkspace(String username, Long workspaceId);

    List<WorkspaceMemberDto> listMembers(String username, Long workspaceId);
    WorkspaceMemberDto addMember(String username, Long workspaceId, WorkspaceMemberDto.AddRequest request);
    void removeMember(String username, Long workspaceId, Long memberUserId);
    WorkspaceMemberDto updateMemberRole(String username, Long workspaceId, Long memberUserId, WorkspaceMemberDto.RoleUpdateRequest request);
    void leaveWorkspace(String username, Long workspaceId);

    List<WorkspaceDto> listWorkspaces(String username);
    WorkspaceDto getWorkspace(String username, Long workspaceId);
    WorkspaceQuotaDto getWorkspaceQuota(String username, Long workspaceId);
    List<WorkspaceActivityDto> getWorkspaceActivity(String username, Long workspaceId);
    
    com.cloudstorage.backend.entity.Workspace getOrCreatePersonalWorkspace(String username);
}
