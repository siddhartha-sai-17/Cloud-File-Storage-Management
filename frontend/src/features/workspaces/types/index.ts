export type WorkspaceType = 'PERSONAL' | 'TEAM';

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';

export type WorkspaceRole = 'GUEST' | 'VIEWER' | 'EDITOR' | 'MANAGER' | 'WORKSPACE_OWNER' | 'SYSTEM_ADMIN';

export type WorkspaceMemberStatus = 'ACTIVE' | 'SUSPENDED';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface WorkspaceDto {
  id: number;
  name: string;
  description?: string;
  ownerUsername: string;
  workspaceType: WorkspaceType;
  storageQuota: number;
  storageUsed: number;
  memberLimit: number;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberDto {
  id: number;
  workspaceId: number;
  userId: number;
  username: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  joinedAt?: string;
  lastActive?: string;
}

export interface WorkspaceInvitationDto {
  id: number;
  workspaceId: number;
  email: string;
  token: string;
  expiresAt: string;
  status: InvitationStatus;
  createdByUsername: string;
  createdAt: string;
}

export interface WorkspaceQuotaDto {
  workspaceId: number;
  workspaceName: string;
  storageQuota: number;
  storageUsed: number;
  usagePercentage: number;
  memberLimit: number;
  memberCount: number;
}

export interface WorkspaceActivityDto {
  id: number;
  workspaceId: number;
  username: string;
  activityType: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  result?: string;
  createdAt: string;
}
