package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import java.util.List;

public interface WorkspaceInvitationService {
    WorkspaceInvitationDto inviteMember(String username, Long workspaceId, WorkspaceInvitationDto.InviteRequest request);
    WorkspaceMemberDto acceptInvitation(String username, String token);
    void rejectInvitation(String username, String token);
    void cancelInvitation(String username, Long invitationId);
    List<WorkspaceInvitationDto> listInvitations(String username, Long workspaceId);
}
