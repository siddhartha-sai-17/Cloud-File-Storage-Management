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
import { cn } from '@/utils/utils';
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
import { motion } from 'framer-motion';

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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="label-caps font-bold">Collaborative Spaces</p>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-[#6366F1]" />
            Workspace Settings
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Create, collaborate, and manage custom team workspaces and permissions.
          </p>
        </motion.div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#6366F1] hover:bg-[#5558DD] text-white font-semibold rounded-[10px] h-9 gap-1.5 shadow-[0_0_16px_rgba(99,102,241,0.25)] border-0 self-start md:self-center transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Create Workspace</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.05] overflow-x-auto gap-4 shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-all px-1 whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-[#6366F1] text-white'
              : 'border-transparent text-[#475569] hover:text-[#94A3B8]'
          }`}
        >
          All Workspaces
        </button>
        {activeWorkspaceId && (
          <>
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'members'
                  ? 'border-[#6366F1] text-white'
                  : 'border-transparent text-[#475569] hover:text-[#94A3B8]'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-3 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'invitations'
                  ? 'border-[#6366F1] text-white'
                  : 'border-transparent text-[#475569] hover:text-[#94A3B8]'
              }`}
            >
              Invitations
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'border-[#6366F1] text-white'
                  : 'border-transparent text-[#475569] hover:text-[#94A3B8]'
              }`}
            >
              Activity Timeline
            </button>
            <button
              onClick={() => setActiveTab('quota')}
              className={`pb-3 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-all px-1 whitespace-nowrap ${
                activeTab === 'quota'
                  ? 'border-[#6366F1] text-white'
                  : 'border-transparent text-[#475569] hover:text-[#94A3B8]'
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
            {workspaces.map((ws, i) => {
              const isCurrent = ws.id === activeWorkspaceId;
              const isOwner = ws.ownerUsername === user?.username;
              const isPersonal = ws.workspaceType === 'PERSONAL';
              const usagePercent = Math.min(100, (ws.storageUsed / ws.storageQuota) * 100);

              return (
                <motion.div
                  key={ws.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className={cn(
                    "vault-card flex flex-col justify-between overflow-hidden relative",
                    isCurrent && "border-[#6366F1] bg-[#6366F1]/5 shadow-[0_0_16px_rgba(99,102,241,0.06)]"
                  )}
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="truncate space-y-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-0.5 text-[9px] font-bold rounded-[5px] uppercase tracking-wide text-white border",
                              isPersonal ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            )}
                          >
                            {ws.workspaceType}
                          </span>
                          {ws.status === 'ARCHIVED' && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-[5px] uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 text-amber-400">
                              ARCHIVED
                            </span>
                          )}
                        </div>
                        <h2 className="text-[17px] font-bold text-white truncate">{ws.name}</h2>
                        <p className="text-[12px] text-[#94A3B8] line-clamp-2 h-10 leading-relaxed">
                          {ws.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Dropdown Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#475569] hover:text-white hover:bg-white/[0.05] rounded-[8px]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#111827] border-white/[0.08] text-[#94A3B8] rounded-[12px] p-1 shadow-vault-xl">
                          <DropdownMenuItem onClick={() => switchWorkspace(ws.id)} className="cursor-pointer py-2 px-2.5 rounded-[8px] hover:bg-white/[0.05] hover:text-white">
                            <Check className="h-4 w-4 mr-2 text-[#818CF8]" /> Activate
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
                                className="cursor-pointer py-2 px-2.5 rounded-[8px] hover:bg-white/[0.05] hover:text-white"
                              >
                                <Settings className="h-4 w-4 mr-2" /> Edit Details
                              </DropdownMenuItem>
                              {ws.status === 'ACTIVE' ? (
                                <DropdownMenuItem
                                  onClick={() => archiveMutation.mutate(ws.id)}
                                  className="cursor-pointer text-amber-400 py-2 px-2.5 rounded-[8px] hover:bg-amber-500/10"
                                >
                                  <Archive className="h-4 w-4 mr-2" /> Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => restoreMutation.mutate(ws.id)}
                                  className="cursor-pointer text-emerald-400 py-2 px-2.5 rounded-[8px] hover:bg-emerald-500/10"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" /> Restore
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-white/[0.04]" />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Are you absolutely sure you want to delete "${ws.name}"? This cannot be undone.`)) {
                                    deleteMutation.mutate(ws.id);
                                  }
                                }}
                                className="cursor-pointer text-rose-400 py-2 px-2.5 rounded-[8px] hover:bg-rose-500/10"
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
                              className="cursor-pointer text-rose-400 py-2 px-2.5 rounded-[8px] hover:bg-rose-500/10"
                            >
                              <LogOut className="h-4 w-4 mr-2" /> Leave
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#64748B] font-semibold">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" /> Storage Utilized
                        </span>
                        <span className="text-[#94A3B8]">
                          {formatSize(ws.storageUsed)} of {formatSize(ws.storageQuota)}
                        </span>
                      </div>
                      <Progress value={usagePercent} className="h-1.5 bg-white/[0.04]" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] py-3 px-5 border-t border-white/[0.05] bg-white/[0.01] text-[#475569] font-bold">
                    <span>Owner: <strong className="text-[#94A3B8]">{ws.ownerUsername}</strong></span>
                    <span>Limit: <strong className="text-[#94A3B8]">{ws.memberLimit} users</strong></span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && activeWorkspaceId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Workspace Members</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Manage active collaborators and role hierarchy.</p>
              </div>
              {hasPermission('TEAM_INVITE') && (
                <div className="flex gap-2">
                  <Button onClick={() => setIsAddMemberOpen(true)} variant="outline" size="sm" className="flex items-center gap-2 h-8.5 rounded-[8px] border-white/[0.06] bg-[#0F172A] hover:bg-[#161F2F] text-xs font-semibold text-[#94A3B8] hover:text-white">
                    <UserPlus className="h-4 w-4 text-[#818CF8]" /> Add Directly
                  </Button>
                  <Button onClick={() => setIsInviteOpen(true)} size="sm" className="bg-[#6366F1] hover:bg-[#5558DD] text-white font-semibold rounded-[8px] h-8.5 text-xs flex items-center gap-2 border-0">
                    <Mail className="h-4 w-4" /> Invite Collaborator
                  </Button>
                </div>
              )}
            </div>

            <div className="border border-white/[0.06] rounded-[16px] overflow-hidden bg-[#111827]">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#0F172A] border-b border-white/[0.05] label-caps">
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Member</th>
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Email</th>
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Role</th>
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Status</th>
                    {hasPermission('TEAM_REMOVE') && <th className="px-6 py-3.5 text-right font-bold tracking-[0.1em] text-[#475569]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {members.map((member) => {
                    const isOwner = member.username === currentWorkspace?.ownerUsername;
                    const isSelf = member.username === user?.username;

                    return (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366F1]/15 text-[#818CF8] font-bold text-xs uppercase border border-[#6366F1]/20">
                            {member.username.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-white">{member.username}</span>
                            {isSelf && <span className="ml-2 text-[9px] bg-[#6366F1]/12 border border-[#6366F1]/25 text-[#818CF8] px-1.5 py-0.5 rounded-[4px] font-bold">YOU</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#94A3B8] font-medium">{member.email}</td>
                        <td className="px-6 py-4">
                          {isOwner ? (
                            <span className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                              <Shield className="h-3.5 w-3.5" /> OWNER
                            </span>
                          ) : hasPermission('TEAM_EDIT') && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => updateRoleMutation.mutate({ userId: member.userId, role: e.target.value as WorkspaceRole })}
                              className="border border-white/[0.08] rounded-[8px] px-2.5 py-1 text-xs text-[#94A3B8] font-semibold bg-[#0F172A] focus:ring-1 focus:ring-[#6366F1]/40 focus:outline-none"
                            >
                              <option value="GUEST">GUEST</option>
                              <option value="VIEWER">VIEWER</option>
                              <option value="EDITOR">EDITOR</option>
                              <option value="MANAGER">MANAGER</option>
                            </select>
                          ) : (
                            <span className="text-[#64748B] text-xs font-semibold">{member.role}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-[5px] uppercase border ${
                            member.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
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
                                className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 rounded-[6px]"
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
                <h3 className="text-lg font-bold text-white">Workspace Invitations</h3>
                <p className="text-xs text-[#64748B] mt-0.5">List collaborator email invites sent to team members.</p>
              </div>
              {hasPermission('TEAM_INVITE') && (
                <Button onClick={() => setIsInviteOpen(true)} className="bg-[#6366F1] hover:bg-[#5558DD] text-white font-semibold rounded-[8px] h-8.5 text-xs flex items-center gap-2 border-0">
                  <Mail className="h-4 w-4" /> Invite Collaborator
                </Button>
              )}
            </div>

            <div className="border border-white/[0.06] rounded-[16px] overflow-hidden bg-[#111827]">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#0F172A] border-b border-white/[0.05] label-caps">
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Invitee Email</th>
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Invited By</th>
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Expiry Date</th>
                    <th className="px-6 py-3.5 font-bold tracking-[0.1em] text-[#475569]">Status</th>
                    {hasPermission('TEAM_INVITE') && <th className="px-6 py-3.5 text-right font-bold tracking-[0.1em] text-[#475569]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-xs text-[#475569] font-medium">
                        No active invitations found.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{inv.email}</td>
                        <td className="px-6 py-4 text-[#94A3B8] font-medium">{inv.createdByUsername}</td>
                        <td className="px-6 py-4 text-[#64748B] font-semibold inline-flex items-center gap-1.5 mt-2">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-[5px] uppercase border ${
                            inv.status === 'PENDING'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : inv.status === 'ACCEPTED'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        {hasPermission('TEAM_INVITE') && (
                          <td className="px-6 py-4 text-right">
                            {inv.status === 'PENDING' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendInviteMutation.mutate(inv.id)}
                                  className="h-7 text-[11px] font-semibold border-white/[0.06] bg-[#0F172A] text-[#94A3B8] hover:text-white rounded-[6px]"
                                >
                                  Resend
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => cancelInviteMutation.mutate(inv.id)}
                                  className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 rounded-[6px]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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
              <h3 className="text-lg font-bold text-white">Activity Logs</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Audit event log history of collaborator operations.</p>
            </div>

            <div className="border border-white/[0.06] rounded-[16px] bg-[#111827] p-6 shadow-vault">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#475569] font-medium flex flex-col items-center justify-center gap-2">
                  <Activity className="h-6 w-6 text-[#475569]/60" />
                  <span>No activities recorded yet.</span>
                </div>
              ) : (
                <div className="relative border-l border-white/[0.05] pl-6 space-y-6">
                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      <span className="absolute -left-[30px] top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-[#6366F1] ring-4 ring-[#6366F1]/15" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-white text-sm">
                            <span className="text-[#818CF8] font-bold">{act.username}</span> performed {act.activityType.replace(/_/g, ' ')}
                          </p>
                          {act.result && <p className="text-xs text-[#64748B] mt-1 font-medium">{act.result}</p>}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#475569] font-semibold">
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
              <h3 className="text-lg font-bold text-white">Quota & Storage Limits</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Overview of storage quota allocations and membership counts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="vault-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4.5 w-4.5 text-[#818CF8]" />
                    <span className="text-sm font-bold text-white">Storage Capacity</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-[5px] bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#818CF8] uppercase tracking-wide">
                    {quotaDetails.usagePercentage.toFixed(1)}% Used
                  </span>
                </div>
                <div className="space-y-2">
                  <Progress value={quotaDetails.usagePercentage} className="h-1.5 bg-white/[0.04]" />
                  <div className="flex justify-between text-xs text-[#475569] font-semibold">
                    <span>{formatSize(quotaDetails.storageUsed)} Used</span>
                    <span>{formatSize(quotaDetails.storageQuota)} Total</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-[12px] leading-relaxed">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>Quota limits are verified server-side. Please manage file versions if storage is running low.</span>
                </div>
              </div>

              <div className="vault-card p-5 space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Collaborator Limits</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-[5px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wide">
                    {quotaDetails.memberCount} Users
                  </span>
                </div>
                <div className="space-y-2">
                  <Progress value={(quotaDetails.memberCount / quotaDetails.memberLimit) * 100} className="h-1.5 bg-white/[0.04]" />
                  <div className="flex justify-between text-xs text-[#475569] font-semibold">
                    <span>{quotaDetails.memberCount} active members</span>
                    <span>Limit: {quotaDetails.memberLimit} members</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* dialogs */}
      {/* 1. Create Workspace Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#111827] border-white/[0.08] text-white rounded-[18px] p-6 shadow-vault-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Create Team Workspace</DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">Setup a dedicated workspace for shared folders and real-time collaboration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-ws-name" className="label-caps">Workspace Name</Label>
              <Input
                id="create-ws-name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="e.g. Finance Team"
                className="bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] rounded-[10px] h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-ws-desc" className="label-caps">Description</Label>
              <Input
                id="create-ws-desc"
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                placeholder="Brief summary of workspace contents"
                className="bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] rounded-[10px] h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-ws-quota" className="label-caps">Quota Limit (GB)</Label>
              <Input
                id="create-ws-quota"
                type="number"
                value={wsQuota}
                onChange={(e) => setWsQuota(parseInt(e.target.value, 10))}
                className="bg-[#0F172A] border-white/10 text-white rounded-[10px] h-10 text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-[#64748B] hover:text-white hover:bg-white/[0.05] rounded-[10px] h-10">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: wsName, description: wsDesc, storageQuota: wsQuota * 1024 * 1024 * 1024 })}
              disabled={!wsName.trim()}
              className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558DD] hover:to-[#7C3AED] text-white font-semibold rounded-[10px] border-0 h-10 px-5 shadow-lg shadow-indigo-600/15"
            >
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Workspace Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#111827] border-white/[0.08] text-white rounded-[18px] p-6 shadow-vault-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Edit Workspace Details</DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">Modify workspace name and description fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-ws-name" className="label-caps">Workspace Name</Label>
              <Input
                id="edit-ws-name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                className="bg-[#0F172A] border-white/10 text-white rounded-[10px] h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-ws-desc" className="label-caps">Description</Label>
              <Input
                id="edit-ws-desc"
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                className="bg-[#0F172A] border-white/10 text-white rounded-[10px] h-10 text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-[#64748B] hover:text-white hover:bg-white/[0.05] rounded-[10px] h-10">Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({ id: selectedWs!.id, name: wsName, description: wsDesc })}
              disabled={!wsName.trim()}
              className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558DD] hover:to-[#7C3AED] text-white font-semibold rounded-[10px] border-0 h-10 px-5 shadow-lg shadow-indigo-600/15"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Send Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="bg-[#111827] border-white/[0.08] text-white rounded-[18px] p-6 shadow-vault-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Invite Collaborator</DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">Invite a user by email to join the workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="label-caps">User Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] rounded-[10px] h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role" className="label-caps">Collaborator Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="w-full border border-white/[0.08] rounded-[10px] px-3 py-2 text-xs text-[#94A3B8] font-semibold bg-[#0F172A] focus:outline-none mt-0.5"
              >
                <option value="GUEST">GUEST</option>
                <option value="VIEWER">VIEWER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button variant="ghost" onClick={() => setIsInviteOpen(false)} className="text-[#64748B] hover:text-white hover:bg-white/[0.05] rounded-[10px] h-10">Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail.trim()}
              className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558DD] hover:to-[#7C3AED] text-white font-semibold rounded-[10px] border-0 h-10 px-5 shadow-lg shadow-indigo-600/15"
            >
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Add Direct Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="bg-[#111827] border-white/[0.08] text-white rounded-[18px] p-6 shadow-vault-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Add Member Directly</DialogTitle>
            <DialogDescription className="text-xs text-[#64748B]">Directly add an existing system user to the workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-member-username" className="label-caps">Username</Label>
              <Input
                id="add-member-username"
                placeholder="e.g. john_doe"
                value={addMemberUsername}
                onChange={(e) => setAddMemberUsername(e.target.value)}
                className="bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] rounded-[10px] h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-member-role" className="label-caps">Member Role</Label>
              <select
                id="add-member-role"
                value={addMemberRole}
                onChange={(e) => setAddMemberRole(e.target.value as WorkspaceRole)}
                className="w-full border border-white/[0.08] rounded-[10px] px-3 py-2 text-xs text-[#94A3B8] font-semibold bg-[#0F172A] focus:outline-none mt-0.5"
              >
                <option value="GUEST">GUEST</option>
                <option value="VIEWER">VIEWER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button variant="ghost" onClick={() => setIsAddMemberOpen(false)} className="text-[#64748B] hover:text-white hover:bg-white/[0.05] rounded-[10px] h-10">Cancel</Button>
            <Button
              onClick={() => addMemberMutation.mutate({ username: addMemberUsername, role: addMemberRole })}
              disabled={!addMemberUsername.trim()}
              className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558DD] hover:to-[#7C3AED] text-white font-semibold rounded-[10px] border-0 h-10 px-5 shadow-lg shadow-indigo-600/15"
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
