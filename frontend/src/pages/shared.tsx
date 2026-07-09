import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Link2,
  Globe,
  Building2,
  Users,
  UserX,
  Shield,
  Download,
  Eye,
  Calendar,
  Lock,
  Trash2,
  Copy,
  QrCode,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sharingService } from '@/features/sharing/services/sharingService';
import type { ShareLinkDto } from '@/features/sharing/services/sharingService';
import { cn } from '@/utils/utils';

function ShareTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    PUBLIC: <Globe className="h-4 w-4 text-emerald-600" />,
    INTERNAL: <Building2 className="h-4 w-4 text-blue-600" />,
    PRIVATE: <Users className="h-4 w-4 text-indigo-600" />,
    ANONYMOUS: <UserX className="h-4 w-4 text-gray-500" />,
  };
  return <>{icons[type] ?? <Link2 className="h-4 w-4" />}</>;
}

export function SharedPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['my-shares', page],
    queryFn: () => sharingService.getMyShares(page, 20),
  });

  const shares: ShareLinkDto[] = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const revokeShareMutation = useMutation({
    mutationFn: (id: string) => sharingService.revokeShare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shares'] });
      toast.success('Share revoked.');
    },
  });

  const deleteShareMutation = useMutation({
    mutationFn: (id: string) => sharingService.deleteShare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shares'] });
      toast.success('Share deleted.');
    },
  });

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/public/${token}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Link copied!'));
  };

  // Cleanup QR code URLs on unmount
  useEffect(() => {
    return () => {
      setQrUrls((prev) => {
        Object.values(prev).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
        return {};
      });
    };
  }, []);

  const loadQr = async (shareId: string) => {
    if (qrUrls[shareId]) {
      const url = qrUrls[shareId];
      if (url) URL.revokeObjectURL(url);
      setQrUrls((prev) => {
        const next = { ...prev };
        delete next[shareId];
        return next;
      });
      return;
    }
    try {
      const blob = await sharingService.getQrCode(shareId);
      const url = URL.createObjectURL(blob);
      setQrUrls((prev) => ({ ...prev, [shareId]: url }));
    } catch {
      toast.error('Failed to load QR code.');
    }
  };

  const filtered = shares.filter((s) =>
    s.fileName?.toLowerCase().includes(search.toLowerCase()) ||
    s.shareType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-indigo-600" />
            Shared Files
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all share links you have created across your workspaces.
          </p>
        </div>
        <Input
          placeholder="Search by file or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Stats Bar */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Links', value: data.totalElements, icon: <Link2 className="h-4 w-4 text-indigo-600" /> },
            { label: 'Active', value: shares.filter((s) => s.active).length, icon: <Globe className="h-4 w-4 text-emerald-600" /> },
            { label: 'Revoked', value: shares.filter((s) => !s.active).length, icon: <Shield className="h-4 w-4 text-red-500" /> },
          ].map((stat) => (
            <div key={stat.label} className="border rounded-xl bg-card p-4 flex items-center gap-3">
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-muted">{stat.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-xl bg-card">
          <Link2 className="h-12 w-12 opacity-30" />
          <p className="text-sm font-medium">No share links found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((share) => {
            const shareUrl = `${window.location.origin}/public/${share.token}`;
            return (
              <div
                key={share.id}
                className={cn(
                  'border rounded-xl p-4 bg-card space-y-3 transition-all',
                  !share.active && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <ShareTypeIcon type={share.shareType} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{share.fileName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase',
                          share.shareType === 'PUBLIC' ? 'bg-emerald-600' :
                          share.shareType === 'PRIVATE' ? 'bg-indigo-600' :
                          share.shareType === 'INTERNAL' ? 'bg-blue-600' : 'bg-gray-500'
                        )}>
                          {share.shareType}
                        </span>
                        <span className="text-xs text-muted-foreground">{share.permission}</span>
                        {!share.active && (
                          <span className="text-[10px] font-bold text-red-600 uppercase">Revoked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(share.token)}
                      aria-label="Copy link"
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => loadQr(share.id)}
                      aria-label="Toggle QR code"
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    {share.active && (
                      <button
                        onClick={() => revokeShareMutation.mutate(share.id)}
                        aria-label="Revoke share"
                        className="h-8 w-8 flex items-center justify-center rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-amber-600"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteShareMutation.mutate(share.id)}
                      aria-label="Delete share"
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Share URL */}
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                  <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{shareUrl}</span>
                  <button onClick={() => copyLink(share.token)} className="shrink-0">
                    <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {share.viewCount} views</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {share.downloadCount} downloads</span>
                  {share.passwordRequired && <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Password protected</span>}
                  {share.downloadLimit !== null && (
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Limit: {share.downloadLimit}</span>
                  )}
                  {share.expiresAt && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                  )}
                  <span>Created {new Date(share.createdAt).toLocaleDateString()} by {share.createdByUsername}</span>
                </div>

                {/* QR Code */}
                {qrUrls[share.id] && (
                  <div className="flex justify-start pt-1">
                    <img
                      src={qrUrls[share.id]}
                      alt="QR Code for share link"
                      className="h-32 w-32 rounded-lg border bg-white p-2 shadow"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
