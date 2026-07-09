import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Link2,
  Copy,
  Shield,
  Download,
  Eye,
  Calendar,
  Lock,
  Trash2,
  QrCode,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Users,
  Globe,
  Building2,
  UserX,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sharingService } from '@/features/sharing/services/sharingService';
import type {
  CreateShareRequest,
  ShareLinkDto,
  ShareType,
  SharePermission,
  FilePermissionGrantRequest,
} from '@/features/sharing/services/sharingService';
import { cn } from '@/utils/utils';

interface ShareDialogProps {
  fileId: number;
  fileName: string;
  open: boolean;
  onClose: () => void;
}

type Tab = 'links' | 'permissions';

const SHARE_TYPE_OPTIONS: { type: ShareType; label: string; description: string; icon: React.ReactNode }[] = [
  { type: 'PUBLIC', label: 'Public', description: 'Anyone with the link', icon: <Globe className="h-4 w-4" /> },
  { type: 'INTERNAL', label: 'Internal', description: 'Logged-in users only', icon: <Building2 className="h-4 w-4" /> },
  { type: 'PRIVATE', label: 'Private', description: 'Specific users only', icon: <Users className="h-4 w-4" /> },
  { type: 'ANONYMOUS', label: 'Anonymous', description: 'Untracked access', icon: <UserX className="h-4 w-4" /> },
];

export function ShareDialog({ fileId, fileName, open, onClose }: ShareDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('links');

  // Create share form
  const [shareType, setShareType] = useState<ShareType>('PUBLIC');
  const [permission, setPermission] = useState<SharePermission>('VIEW');
  const [allowPreview, setAllowPreview] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState('');
  const [downloadLimit, setDownloadLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [targetUsernames, setTargetUsernames] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // File permission form
  const [permUsername, setPermUsername] = useState('');
  const [permType, setPermType] = useState('FILE_READ');
  const [permDuration, setPermDuration] = useState('');

  // QR state
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Query: my existing shares for this file (filter client-side by fileId from paginated result)
  const { data: sharesData, isLoading: isLoadingShares } = useQuery({
    queryKey: ['my-shares', fileId],
    queryFn: () => sharingService.getMyShares(0, 50),
    enabled: open && tab === 'links',
    select: (data) => data.content.filter((s) => s.fileId === fileId),
  });
  const shares: ShareLinkDto[] = sharesData ?? [];

  // Query: file permissions
  const { data: filePermissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ['file-permissions', fileId],
    queryFn: () => sharingService.getFilePermissions(fileId),
    enabled: open && tab === 'permissions',
  });

  const createShareMutation = useMutation({
    mutationFn: (req: CreateShareRequest) => sharingService.createShare(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shares', fileId] });
      toast.success('Share link created!');
      setPassword('');
      setDownloadLimit('');
      setExpiresAt('');
      setTargetUsernames('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create share.'),
  });

  const revokeShareMutation = useMutation({
    mutationFn: (id: string) => sharingService.revokeShare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shares', fileId] });
      toast.success('Share revoked.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to revoke.'),
  });

  const deleteShareMutation = useMutation({
    mutationFn: (id: string) => sharingService.deleteShare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shares', fileId] });
      toast.success('Share deleted.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete.'),
  });

  const grantPermMutation = useMutation({
    mutationFn: (req: FilePermissionGrantRequest) => sharingService.grantFilePermission(fileId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-permissions', fileId] });
      toast.success('Permission granted.');
      setPermUsername('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to grant permission.'),
  });

  const revokePermMutation = useMutation({
    mutationFn: (permId: number) => sharingService.revokeFilePermission(fileId, permId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-permissions', fileId] });
      toast.success('Permission revoked.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to revoke permission.'),
  });

  const handleCreateShare = () => {
    const req: CreateShareRequest = {
      fileId,
      shareType,
      permission,
      allowPreview,
      allowDownload,
    };
    if (password) req.password = password;
    if (downloadLimit) req.downloadLimit = parseInt(downloadLimit, 10);
    if (expiresAt) req.expiresAt = expiresAt;
    if (shareType === 'PRIVATE' && targetUsernames) {
      req.targetUsernames = targetUsernames.split(',').map((u) => u.trim()).filter(Boolean);
    }
    createShareMutation.mutate(req);
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/public/${token}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Link copied to clipboard!'));
  };

  const loadQr = async (shareId: string) => {
    try {
      const blob = await sharingService.getQrCode(shareId);
      const url = URL.createObjectURL(blob);
      setQrUrl(url);
    } catch {
      toast.error('Failed to load QR code.');
    }
  };

  // Cleanup QR blob on close
  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [qrUrl]);

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setQrUrl(null); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-600" />
            Share: {fileName}
          </DialogTitle>
          <DialogDescription>Create share links or assign direct file permissions.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setTab('links')}
            className={cn(
              'pb-2 text-sm font-semibold border-b-2 transition-all',
              tab === 'links' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Share Links
          </button>
          <button
            onClick={() => setTab('permissions')}
            className={cn(
              'pb-2 text-sm font-semibold border-b-2 transition-all',
              tab === 'permissions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Direct Permissions
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-6 pt-2">
          {/* --- Share Links Tab --- */}
          {tab === 'links' && (
            <div className="space-y-6">
              {/* Create Share Form */}
              <div className="border rounded-xl p-4 space-y-4 bg-muted/20">
                <h3 className="text-sm font-bold">Create New Share Link</h3>

                {/* Share Type */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SHARE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setShareType(opt.type)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all',
                        shareType === opt.type
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700'
                          : 'border-muted bg-background text-muted-foreground hover:border-foreground/20'
                      )}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-normal text-center opacity-70">{opt.description}</span>
                    </button>
                  ))}
                </div>

                {/* Permission + toggles */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="space-y-1">
                    <Label htmlFor="share-permission">Permission</Label>
                    <select
                      id="share-permission"
                      value={permission}
                      onChange={(e) => setPermission(e.target.value as SharePermission)}
                      className="border rounded px-2 py-1.5 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="VIEW">VIEW</option>
                      <option value="DOWNLOAD">DOWNLOAD</option>
                      <option value="EDIT">EDIT</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setAllowPreview((p) => !p)}
                    className="flex items-center gap-1.5 text-sm text-foreground"
                    aria-pressed={allowPreview}
                  >
                    {allowPreview ? <ToggleRight className="h-5 w-5 text-indigo-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>

                  <button
                    onClick={() => setAllowDownload((p) => !p)}
                    className="flex items-center gap-1.5 text-sm text-foreground"
                    aria-pressed={allowDownload}
                  >
                    {allowDownload ? <ToggleRight className="h-5 w-5 text-indigo-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>

                {/* Private target usernames */}
                {shareType === 'PRIVATE' && (
                  <div className="space-y-1">
                    <Label htmlFor="share-target-users">Target Usernames (comma separated)</Label>
                    <Input
                      id="share-target-users"
                      value={targetUsernames}
                      onChange={(e) => setTargetUsernames(e.target.value)}
                      placeholder="alice, bob, charlie"
                    />
                  </div>
                )}

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvanced((p) => !p)}
                  className="text-xs text-indigo-600 hover:underline focus:outline-none"
                >
                  {showAdvanced ? '▾ Hide' : '▸ Show'} advanced options
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="share-password" className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3" /> Password
                      </Label>
                      <Input
                        id="share-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="share-dl-limit" className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3" /> Download limit
                      </Label>
                      <Input
                        id="share-dl-limit"
                        type="number"
                        value={downloadLimit}
                        onChange={(e) => setDownloadLimit(e.target.value)}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="share-expires" className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Expires at
                      </Label>
                      <Input
                        id="share-expires"
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCreateShare}
                  disabled={createShareMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {createShareMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Share Link
                </Button>
              </div>

              {/* Existing Share Links */}
              {isLoadingShares ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : shares.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold">Active Share Links ({shares.length})</h3>
                  {shares.map((share) => {
                    const shareUrl = `${window.location.origin}/public/${share.token}`;
                    return (
                      <div
                        key={share.id}
                        className="border rounded-lg p-3 space-y-2 bg-card"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs min-w-0">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full font-bold uppercase text-[10px] text-white',
                              share.shareType === 'PUBLIC' ? 'bg-emerald-600' :
                              share.shareType === 'PRIVATE' ? 'bg-indigo-600' :
                              share.shareType === 'INTERNAL' ? 'bg-blue-600' : 'bg-gray-500'
                            )}>
                              {share.shareType}
                            </span>
                            <span className="font-semibold text-muted-foreground">{share.permission}</span>
                            {!share.active && (
                              <span className="text-red-600 font-semibold text-[10px]">REVOKED</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => copyLink(share.token)}
                              aria-label="Copy link"
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => loadQr(share.id)}
                              aria-label="Show QR code"
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                            {share.active && (
                              <button
                                onClick={() => revokeShareMutation.mutate(share.id)}
                                aria-label="Revoke share"
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-amber-600"
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteShareMutation.mutate(share.id)}
                              aria-label="Delete share"
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="truncate text-xs text-muted-foreground bg-muted rounded px-2 py-1 font-mono">
                          {shareUrl}
                        </div>

                        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                          {share.passwordRequired && <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Password protected</span>}
                          {share.downloadLimit !== null && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" /> {share.downloadCount}/{share.downloadLimit} downloads
                            </span>
                          )}
                          {share.expiresAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Expires {new Date(share.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                          <span>{share.viewCount} views · {share.downloadCount} downloads</span>
                        </div>

                        {/* QR Code image */}
                        {qrUrl && (
                          <div className="flex items-center justify-center pt-2">
                            <img src={qrUrl} alt="QR Code" className="h-32 w-32 rounded border" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {/* --- Permissions Tab --- */}
          {tab === 'permissions' && (
            <div className="space-y-6">
              {/* Grant form */}
              <div className="border rounded-xl p-4 space-y-4 bg-muted/20">
                <h3 className="text-sm font-bold">Grant Direct File Permission</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="perm-username">Username</Label>
                    <Input
                      id="perm-username"
                      value={permUsername}
                      onChange={(e) => setPermUsername(e.target.value)}
                      placeholder="e.g. alice"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="perm-type">Permission Type</Label>
                    <select
                      id="perm-type"
                      value={permType}
                      onChange={(e) => setPermType(e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="FILE_READ">FILE_READ</option>
                      <option value="FILE_WRITE">FILE_WRITE</option>
                      <option value="FILE_DELETE">FILE_DELETE</option>
                      <option value="FILE_SHARE">FILE_SHARE</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="perm-duration">Duration (minutes)</Label>
                    <Input
                      id="perm-duration"
                      type="number"
                      value={permDuration}
                      onChange={(e) => setPermDuration(e.target.value)}
                      placeholder="Permanent"
                    />
                  </div>
                </div>
                <Button
                  onClick={() =>
                    grantPermMutation.mutate({
                      username: permUsername,
                      permission: permType,
                      durationMinutes: permDuration ? parseInt(permDuration, 10) : undefined,
                    })
                  }
                  disabled={!permUsername.trim() || grantPermMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {grantPermMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Grant Permission
                </Button>
              </div>

              {/* Existing permissions */}
              {isLoadingPerms ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filePermissions.length > 0 ? (
                <div className="border rounded-lg overflow-hidden bg-card">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                        <th className="px-4 py-2">User</th>
                        <th className="px-4 py-2">Permission</th>
                        <th className="px-4 py-2">Granted by</th>
                        <th className="px-4 py-2">Expires</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filePermissions.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-all">
                          <td className="px-4 py-2 font-semibold">{p.username}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.permission}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.grantedByUsername}</td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'Permanent'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => revokePermMutation.mutate(p.id)}
                              aria-label="Revoke permission"
                              className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No direct permissions granted for this file.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
