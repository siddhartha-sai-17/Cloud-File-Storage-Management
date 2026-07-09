import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthProvider';
import { workspaceService } from '../features/workspaces/services/workspaceService';
import type { WorkspaceDto, WorkspaceRole, WorkspaceMemberDto } from '../features/workspaces/types';

type WorkspaceContextType = {
  currentWorkspace: WorkspaceDto | null;
  workspaces: WorkspaceDto[];
  members: WorkspaceMemberDto[];
  isLoading: boolean;
  activeWorkspaceId: number | null;
  switchWorkspace: (id: number | null) => void;
  refetchWorkspaces: () => void;
  currentUserRole: WorkspaceRole | null;
  hasPermission: (permission: string) => boolean;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Role permissions mapping matching backend RoleHierarchyService
const ROLE_PERMISSIONS: Record<WorkspaceRole, Set<string>> = {
  GUEST: new Set(['FILE_READ', 'SEARCH_VIEW']),
  VIEWER: new Set(['FILE_READ', 'SEARCH_VIEW', 'OCR_VIEW']),
  EDITOR: new Set([
    'FILE_READ',
    'SEARCH_VIEW',
    'OCR_VIEW',
    'FILE_WRITE',
    'FILE_VERSION',
    'FILE_RESTORE',
    'UPLOAD_CREATE',
    'UPLOAD_CANCEL',
  ]),
  MANAGER: new Set([
    'FILE_READ',
    'SEARCH_VIEW',
    'OCR_VIEW',
    'FILE_WRITE',
    'FILE_VERSION',
    'FILE_RESTORE',
    'UPLOAD_CREATE',
    'UPLOAD_CANCEL',
    'FILE_DELETE',
    'FILE_SHARE',
    'TEAM_INVITE',
    'TEAM_REMOVE',
  ]),
  WORKSPACE_OWNER: new Set([
    'FILE_READ',
    'SEARCH_VIEW',
    'OCR_VIEW',
    'FILE_WRITE',
    'FILE_VERSION',
    'FILE_RESTORE',
    'UPLOAD_CREATE',
    'UPLOAD_CANCEL',
    'FILE_DELETE',
    'FILE_SHARE',
    'TEAM_INVITE',
    'TEAM_REMOVE',
    'TEAM_EDIT',
    'WORKSPACE_ADMIN',
  ]),
  SYSTEM_ADMIN: new Set([
    'FILE_READ',
    'SEARCH_VIEW',
    'OCR_VIEW',
    'FILE_WRITE',
    'FILE_VERSION',
    'FILE_RESTORE',
    'UPLOAD_CREATE',
    'UPLOAD_CANCEL',
    'FILE_DELETE',
    'FILE_SHARE',
    'TEAM_INVITE',
    'TEAM_REMOVE',
    'TEAM_EDIT',
    'WORKSPACE_ADMIN',
  ]),
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(() => {
    const saved = localStorage.getItem('activeWorkspaceId');
    return saved ? parseInt(saved, 10) : null;
  });

  // Query all workspaces user belongs to
  const {
    data: workspaces = [],
    isLoading: isLoadingWorkspaces,
    refetch: refetchWorkspaces,
  } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.listWorkspaces,
    enabled: isAuthenticated,
  });

  // Find current workspace from loaded list
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  // Query workspace members to find user role
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: () => workspaceService.listMembers(activeWorkspaceId!),
    enabled: isAuthenticated && activeWorkspaceId !== null,
  });

  // Set default workspace if none selected
  useEffect(() => {
    if (isAuthenticated && workspaces.length > 0 && activeWorkspaceId === null) {
      // Find personal workspace to set as default, otherwise pick the first workspace
      const personal = workspaces.find((w) => w.workspaceType === 'PERSONAL');
      const defaultId = personal ? personal.id : workspaces[0].id;
      setActiveWorkspaceId(defaultId);
      localStorage.setItem('activeWorkspaceId', defaultId.toString());
    }
  }, [isAuthenticated, workspaces, activeWorkspaceId]);

  const switchWorkspace = (id: number | null) => {
    setActiveWorkspaceId(id);
    if (id !== null) {
      localStorage.setItem('activeWorkspaceId', id.toString());
    } else {
      localStorage.removeItem('activeWorkspaceId');
    }
  };

  // Determine current user's role in the active workspace
  let currentUserRole: WorkspaceRole | null = null;
  if (currentWorkspace && user) {
    if (currentWorkspace.ownerUsername === user.username) {
      currentUserRole = 'WORKSPACE_OWNER';
    } else {
      const member = members.find((m) => m.username === user.username);
      if (member) {
        currentUserRole = member.role;
      } else {
        // Fallback or guest
        currentUserRole = 'VIEWER';
      }
    }
  }

  // Permission resolver helper
  const hasPermission = (permission: string): boolean => {
    if (user?.role === 'ROLE_ADMIN' || currentUserRole === 'SYSTEM_ADMIN') {
      return true;
    }
    if (!currentUserRole) {
      return false;
    }
    return ROLE_PERMISSIONS[currentUserRole]?.has(permission) || false;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        members,
        isLoading: isLoadingWorkspaces || isLoadingMembers,
        activeWorkspaceId,
        switchWorkspace,
        refetchWorkspaces,
        currentUserRole,
        hasPermission,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
