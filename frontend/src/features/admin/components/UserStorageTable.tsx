import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '@/features/workspaces/services/workspaceService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, UserMinus } from 'lucide-react';
import type { WorkspaceRole } from '@/features/workspaces/types';

export function UserStorageTable() {
  const queryClient = useQueryClient();
  const { currentWorkspace, members } = useWorkspace();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: WorkspaceRole }) =>
      workspaceService.updateMemberRole(currentWorkspace!.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast.success('Member role updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update member role');
    },
    onSettled: () => setUpdatingId(null),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => workspaceService.removeMember(currentWorkspace!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast.success('Member removed successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    },
  });

  const handleRoleChange = (userId: number, role: WorkspaceRole) => {
    setUpdatingId(userId);
    changeRoleMutation.mutate({ userId, role });
  };

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-indigo-600" />
        <h3 className="text-sm font-bold">Workspace Member Administration</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Manage collaborators, roles, and platform permissions within the active workspace context.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <th className="p-3">Username</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-muted/10">
                <td className="p-3 font-semibold text-xs">{member.username}</td>
                <td className="p-3">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value as WorkspaceRole)}
                    disabled={updatingId === member.userId}
                    className="border rounded px-2 py-1 text-xs bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                    aria-label={`Select role for ${member.username}`}
                  >
                    <option value="GUEST">GUEST</option>
                    <option value="VIEWER">VIEWER</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="WORKSPACE_OWNER">WORKSPACE_OWNER</option>
                  </select>
                </td>
                <td className="p-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                    Active
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-red-50 hover:text-red-600"
                    onClick={() => {
                      if (confirm(`Remove member ${member.username}?`)) {
                        removeMemberMutation.mutate(member.userId);
                      }
                    }}
                  >
                    <UserMinus className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
