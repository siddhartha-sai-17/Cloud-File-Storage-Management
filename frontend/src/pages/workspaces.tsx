import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Settings,
  Trash2,
  Archive,
  RotateCcw,
  LogOut,
  Mail,
  UserPlus,
  Shield,
  Clock,
  HardDrive,
  Check,
  MoreVertical,
  Activity,
  AlertTriangle,
} from 'lucide-react';

import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { workspaceService } from '@/features/workspaces/services/workspaceService';
import type { WorkspaceRole, WorkspaceDto } from '@/features/workspaces/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

export function WorkspacesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    currentWorkspace,
    workspaces,
    members,
    activeWorkspaceId,
    switchWorkspace,
    hasPermission,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'all' | 'members' | 'invitations' | 'activity' | 'quota'>('all');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWs, setSelectedWs] = useState<WorkspaceDto | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Form states
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [wsQuota, setWsQuota] = useState(10); // GB
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('VIEWER');
  const [addMemberUsername, setAddMemberUsername] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<WorkspaceRole>('VIEWER');

  // Fetch invitations for the active workspace
  const { data: invitations = [] } = useQuery({
    queryKey: ['workspace-invitations', activeWorkspaceId],
    queryFn: () => workspaceService.listInvitations(activeWorkspaceId!),
    enabled: activeWorkspaceId !== null && (activeTab === 'invitations' || activeTab === 'all'),
  });

  // Fetch activities for the active workspace
  const { data: activities = [] } = useQuery({
    queryKey: ['workspace-activities', activeWorkspaceId],
    queryFn: () => workspaceService.getActivity(activeWorkspaceId!),
    enabled: activeWorkspaceId !== null && activeTab === 'activity',
  });

  // Fetch active workspace quota
  const { data: quotaDetails } = useQuery({
    queryKey: ['workspace-quota', activeWorkspaceId],
    queryFn: () => workspaceService.getQuota(activeWorkspaceId!),
    enabled: activeWorkspaceId !== null && activeTab === 'quota',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: workspaceService.createWorkspace,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created successfully!');
      setIsCreateOpen(false);
      setWsName('');
      setWsDesc('');
      switchWorkspace(data.id);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create workspace.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: number; name: string; description?: string }) =>
      workspaceService.updateWorkspace(id, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace updated successfully!');
      setIsEditOpen(false);
      setSelectedWs(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update workspace.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: workspaceService.deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deleted successfully.');
      switchWorkspace(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete workspace.');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: workspaceService.archiveWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace archived.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to archive workspace.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: workspaceService.restoreWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace restored.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore workspace.');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: workspaceService.leaveWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('You have left the workspace.');
      switchWorkspace(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to leave workspace.');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { username: string; role: WorkspaceRole }) =>
      workspaceService.addMember(activeWorkspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', activeWorkspaceId] });
      toast.success('Member added successfully.');
      setIsAddMemberOpen(false);
      setAddMemberUsername('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add member.');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: WorkspaceRole }) =>
      workspaceService.updateMemberRole(activeWorkspaceId!, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', activeWorkspaceId] });
      toast.success('Member role updated.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => workspaceService.removeMember(activeWorkspaceId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', activeWorkspaceId] });
      toast.success('Member removed from workspace.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: WorkspaceRole }) =>
      workspaceService.inviteMember(activeWorkspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', activeWorkspaceId] });
      toast.success('Invitation sent successfully.');
      setIsInviteOpen(false);
      setInviteEmail('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send invitation.');
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: workspaceService.cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', activeWorkspaceId] });
      toast.success('Invitation cancelled.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel invitation.');
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: workspaceService.resendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', activeWorkspaceId] });
      toast.success('Invitation resent.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to resend invitation.');
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
            Workspace Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, collaborate, and manage custom team workspaces and permissions.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create Workspace
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-muted mb-6 overflow-x-auto gap-4 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All Workspaces
        </button>
        {activeWorkspaceId && (
          <>
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'members'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'invitations'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Invitations
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Activity Timeline
            </button>
            <button
              onClick={() => setActiveTab('quota')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'quota'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Quota & Usage
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab 1: All Workspaces */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => {
              const isCurrent = ws.id === activeWorkspaceId;
              const isOwner = ws.ownerUsername === user?.username;
              const isPersonal = ws.workspaceType === 'PERSONAL';
              const usagePercent = Math.min(100, (ws.storageUsed / ws.storageQuota) * 100);

              return (
                <Card
                  key={ws.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg border ${
                    isCurrent ? 'ring-2 ring-indigo-500/50 border-indigo-500' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider text-white ${
                              isPersonal ? 'bg-indigo-600' : 'bg-emerald-600'
                            }`}
                          >
                            {ws.workspaceType}
                          </span>
                          {ws.status === 'ARCHIVED' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-amber-500 text-white">
                              ARCHIVED
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-xl font-bold truncate mt-2">{ws.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1 h-10">
                          {ws.description || 'No description provided.'}
                        </CardDescription>
                      </div>

                      {/* Dropdown Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => switchWorkspace(ws.id)} className="cursor-pointer">
                            <Check className="h-4 w-4 mr-2" /> Active Workspace
                          </DropdownMenuItem>
                          {isOwner && !isPersonal && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedWs(ws);
                                  setWsName(ws.name);
                                  setWsDesc(ws.description || '');
                                  setIsEditOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Settings className="h-4 w-4 mr-2" /> Edit Workspace
                              </DropdownMenuItem>
                              {ws.status === 'ACTIVE' ? (
                                <DropdownMenuItem
                                  onClick={() => archiveMutation.mutate(ws.id)}
                                  className="cursor-pointer text-amber-600"
                                >
                                  <Archive className="h-4 w-4 mr-2" /> Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => restoreMutation.mutate(ws.id)}
                                  className="cursor-pointer text-emerald-600"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" /> Restore
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Are you absolutely sure you want to delete "${ws.name}"? This cannot be undone.`)) {
                                    deleteMutation.mutate(ws.id);
                                  }
                                }}
                                className="cursor-pointer text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {!isOwner && !isPersonal && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Are you sure you want to leave "${ws.name}"?`)) {
                                  leaveMutation.mutate(ws.id);
                                }
                              }}
                              className="cursor-pointer text-destructive"
                            >
                              <LogOut className="h-4 w-4 mr-2" /> Leave Workspace
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" /> Quota
                        </span>
                        <span>
                          {formatSize(ws.storageUsed)} of {formatSize(ws.storageQuota)}
                        </span>
                      </div>
                      <Progress value={usagePercent} className="h-1.5 bg-muted" />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-muted">
                      <span className="text-muted-foreground">Owner: <strong className="text-foreground">{ws.ownerUsername}</strong></span>
                      <span className="text-muted-foreground">Members limit: <strong className="text-foreground">{ws.memberLimit}</strong></span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && activeWorkspaceId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Workspace Members</h3>
                <p className="text-xs text-muted-foreground">Manage active collaborators and role hierarchy.</p>
              </div>
              {hasPermission('TEAM_INVITE') && (
                <div className="flex gap-2">
                  <Button onClick={() => setIsAddMemberOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Add Directly
                  </Button>
                  <Button onClick={() => setIsInviteOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Invite Collaborator
                  </Button>
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Status</th>
                    {hasPermission('TEAM_REMOVE') && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {members.map((member) => {
                    const isOwner = member.username === currentWorkspace?.ownerUsername;
                    const isSelf = member.username === user?.username;

                    return (
                      <tr key={member.id} className="hover:bg-muted/20 transition-all">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs uppercase">
                            {member.username.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold">{member.username}</span>
                            {isSelf && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">YOU</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{member.email}</td>
                        <td className="px-6 py-4">
                          {isOwner ? (
                            <span className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                              <Shield className="h-3.5 w-3.5" /> WORKSPACE_OWNER
                            </span>
                          ) : hasPermission('TEAM_EDIT') && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => updateRoleMutation.mutate({ userId: member.userId, role: e.target.value as WorkspaceRole })}
                              className="border rounded bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            >
                              <option value="GUEST">GUEST</option>
                              <option value="VIEWER">VIEWER</option>
                              <option value="EDITOR">EDITOR</option>
                              <option value="MANAGER">MANAGER</option>
                            </select>
                          ) : (
                            <span className="text-muted-foreground text-xs font-semibold">{member.role}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        {hasPermission('TEAM_REMOVE') && (
                          <td className="px-6 py-4 text-right">
                            {!isOwner && !isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm(`Remove "${member.username}" from workspace?`)) {
                                    removeMemberMutation.mutate(member.userId);
                                  }
                                }}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Invitations */}
        {activeTab === 'invitations' && activeWorkspaceId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Workspace Invitations</h3>
                <p className="text-xs text-muted-foreground">List collaborator email invites sent to team members.</p>
              </div>
              {hasPermission('TEAM_INVITE') && (
                <Button onClick={() => setIsInviteOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Invite Collaborator
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                    <th className="px-6 py-3">Invitee Email</th>
                    <th className="px-6 py-3">Invited By</th>
                    <th className="px-6 py-3">Expiry Date</th>
                    <th className="px-6 py-3">Status</th>
                    {hasPermission('TEAM_INVITE') && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No invitations found.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-all">
                        <td className="px-6 py-4 font-semibold">{inv.email}</td>
                        <td className="px-6 py-4 text-muted-foreground">{inv.createdByUsername}</td>
                        <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            inv.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : inv.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        {hasPermission('TEAM_INVITE') && (
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            {inv.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendInviteMutation.mutate(inv.id)}
                                  className="h-8 text-xs"
                                >
                                  Resend
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => cancelInviteMutation.mutate(inv.id)}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Activity Timeline */}
        {activeTab === 'activity' && activeWorkspaceId && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">Activity Logs</h3>
              <p className="text-xs text-muted-foreground">Audit event log history of collaborator operations.</p>
            </div>

            <div className="border rounded-lg bg-card p-6">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Activity className="h-8 w-8 text-muted-foreground/50" />
                  <span>No activities recorded yet.</span>
                </div>
              ) : (
                <div className="relative border-l pl-6 space-y-6">
                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 border-2 border-indigo-600" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">
                            <span className="text-indigo-600">{act.username}</span> performed {act.activityType.replace(/_/g, ' ')}
                          </p>
                          {act.result && <p className="text-xs text-muted-foreground mt-0.5">{act.result}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {act.ip && <span>IP: {act.ip}</span>}
                          <span>{new Date(act.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Quota & Usage */}
        {activeTab === 'quota' && activeWorkspaceId && quotaDetails && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">Quota & Storage Limits</h3>
              <p className="text-xs text-muted-foreground">Overview of storage quota allocations and membership counts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-indigo-600" /> Storage Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-extrabold">{quotaDetails.usagePercentage.toFixed(1)}%</span>
                      <span className="text-xs text-muted-foreground ml-2">used</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatSize(quotaDetails.storageUsed)} / {formatSize(quotaDetails.storageQuota)}
                    </span>
                  </div>
                  <Progress value={quotaDetails.usagePercentage} className="h-2 bg-muted" />
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/50">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Quota limits are verified server-side. Please manage file versions if storage is running low.</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" /> Collaborator Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-extrabold">{quotaDetails.memberCount}</span>
                      <span className="text-xs text-muted-foreground ml-2">active members</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Limit: {quotaDetails.memberLimit} members
                    </span>
                  </div>
                  <Progress value={(quotaDetails.memberCount / quotaDetails.memberLimit) * 100} className="h-2 bg-muted" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* dialogs */}
      {/* 1. Create Workspace Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team Workspace</DialogTitle>
            <DialogDescription>Setup a dedicated workspace for shared folders and real-time collaboration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-ws-name">Workspace Name</Label>
              <Input
                id="create-ws-name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="e.g. Finance Team"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-ws-desc">Description</Label>
              <Input
                id="create-ws-desc"
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                placeholder="Brief summary of workspace contents"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-ws-quota">Quota Limit (GB)</Label>
              <Input
                id="create-ws-quota"
                type="number"
                value={wsQuota}
                onChange={(e) => setWsQuota(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: wsName, description: wsDesc, storageQuota: wsQuota * 1024 * 1024 * 1024 })}
              disabled={!wsName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Workspace Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace Details</DialogTitle>
            <DialogDescription>Modify workspace name and description description fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-ws-name">Workspace Name</Label>
              <Input
                id="edit-ws-name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-ws-desc">Description</Label>
              <Input
                id="edit-ws-desc"
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({ id: selectedWs!.id, name: wsName, description: wsDesc })}
              disabled={!wsName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Send Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
            <DialogDescription>Invite a user by email to join the workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="invite-email">User Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-role">Collaborator Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="w-full border rounded bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="GUEST">GUEST</option>
                <option value="VIEWER">VIEWER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Add Direct Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member Directly</DialogTitle>
            <DialogDescription>Directly add an existing system user to the workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="add-member-username">Username</Label>
              <Input
                id="add-member-username"
                placeholder="e.g. john_doe"
                value={addMemberUsername}
                onChange={(e) => setAddMemberUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-member-role">Member Role</Label>
              <select
                id="add-member-role"
                value={addMemberRole}
                onChange={(e) => setAddMemberRole(e.target.value as WorkspaceRole)}
                className="w-full border rounded bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="GUEST">GUEST</option>
                <option value="VIEWER">VIEWER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMemberMutation.mutate({ username: addMemberUsername, role: addMemberRole })}
              disabled={!addMemberUsername.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default WorkspacesPage;
