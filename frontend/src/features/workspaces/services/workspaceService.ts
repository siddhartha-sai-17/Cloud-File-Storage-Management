import { apiClient } from '../../../api/axios';
import type {
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceInvitationDto,
  WorkspaceQuotaDto,
  WorkspaceActivityDto,
  WorkspaceRole,
} from '../types';

export const workspaceService = {
  // List user's workspaces
  listWorkspaces: async (): Promise<WorkspaceDto[]> => {
    const response = await apiClient.get<WorkspaceDto[]>('/api/workspaces');
    return response.data;
  },

  // Create team workspace
  createWorkspace: async (data: { name: string; description?: string; storageQuota?: number }): Promise<WorkspaceDto> => {
    const response = await apiClient.post<WorkspaceDto>('/api/workspaces', data);
    return response.data;
  },

  // Get single workspace details
  getWorkspace: async (id: number): Promise<WorkspaceDto> => {
    const response = await apiClient.get<WorkspaceDto>(`/api/workspaces/${id}`);
    return response.data;
  },

  // Update workspace details
  updateWorkspace: async (id: number, data: { name: string; description?: string }): Promise<WorkspaceDto> => {
    const response = await apiClient.put<WorkspaceDto>(`/api/workspaces/${id}`, data);
    return response.data;
  },

  // Delete/remove workspace
  deleteWorkspace: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/workspaces/${id}`);
  },

  // Archive workspace
  archiveWorkspace: async (id: number): Promise<WorkspaceDto> => {
    const response = await apiClient.post<WorkspaceDto>(`/api/workspaces/${id}/archive`);
    return response.data;
  },

  // Restore workspace
  restoreWorkspace: async (id: number): Promise<WorkspaceDto> => {
    const response = await apiClient.post<WorkspaceDto>(`/api/workspaces/${id}/restore`);
    return response.data;
  },

  // Get storage quota details
  getQuota: async (id: number): Promise<WorkspaceQuotaDto> => {
    const response = await apiClient.get<WorkspaceQuotaDto>(`/api/workspaces/${id}/quota`);
    return response.data;
  },

  // Get workspace activity audit timeline
  getActivity: async (id: number): Promise<WorkspaceActivityDto[]> => {
    const response = await apiClient.get<WorkspaceActivityDto[]>(`/api/workspaces/${id}/activity`);
    return response.data;
  },

  // List members
  listMembers: async (workspaceId: number): Promise<WorkspaceMemberDto[]> => {
    const response = await apiClient.get<WorkspaceMemberDto[]>(`/api/workspaces/${workspaceId}/members`);
    return response.data;
  },

  // Add member directly
  addMember: async (workspaceId: number, data: { username: string; role: WorkspaceRole }): Promise<WorkspaceMemberDto> => {
    const response = await apiClient.post<WorkspaceMemberDto>(`/api/workspaces/${workspaceId}/members`, data);
    return response.data;
  },

  // Update member role
  updateMemberRole: async (workspaceId: number, userId: number, role: WorkspaceRole): Promise<WorkspaceMemberDto> => {
    const response = await apiClient.patch<WorkspaceMemberDto>(
      `/api/workspaces/${workspaceId}/members/${userId}/role`,
      { role }
    );
    return response.data;
  },

  // Remove member
  removeMember: async (workspaceId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
  },

  // Leave workspace
  leaveWorkspace: async (workspaceId: number): Promise<void> => {
    await apiClient.post(`/api/workspaces/${workspaceId}/members/leave`);
  },

  // List invitations
  listInvitations: async (workspaceId: number): Promise<WorkspaceInvitationDto[]> => {
    const response = await apiClient.get<WorkspaceInvitationDto[]>(`/api/workspaces/${workspaceId}/invitations`);
    return response.data;
  },

  // Invite member
  inviteMember: async (workspaceId: number, data: { email: string; role: WorkspaceRole }): Promise<WorkspaceInvitationDto> => {
    const response = await apiClient.post<WorkspaceInvitationDto>(`/api/workspaces/${workspaceId}/invite`, data);
    return response.data;
  },

  // Accept invitation (requires auth but token is path parameter)
  acceptInvitation: async (token: string): Promise<void> => {
    await apiClient.post(`/api/workspaces/invitations/${token}/accept`);
  },

  // Resend invitation
  resendInvitation: async (invitationId: number): Promise<WorkspaceInvitationDto> => {
    const response = await apiClient.post<WorkspaceInvitationDto>(`/api/workspaces/invitations/${invitationId}/resend`);
    return response.data;
  },

  // Cancel invitation
  cancelInvitation: async (invitationId: number): Promise<void> => {
    await apiClient.post(`/api/workspaces/invitations/${invitationId}/cancel`);
  },
};
