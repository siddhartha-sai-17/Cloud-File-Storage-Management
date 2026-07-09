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
import { motion } from 'framer-motion';

function ShareTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    PUBLIC: <Globe className="h-4 w-4 text-emerald-400" />,
    INTERNAL: <Building2 className="h-4 w-4 text-blue-400" />,
    PRIVATE: <Users className="h-4 w-4 text-indigo-400" />,
    ANONYMOUS: <UserX className="h-4 w-4 text-[#475569]" />,
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
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="label-caps font-bold">Public Links</p>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Link2 className="h-7 w-7 text-[#6366F1]" />
            Shared Links
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage all share links you have created across your workspaces.
          </p>
        </motion.div>
        <Input
          placeholder="Search shared files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] rounded-[10px] h-9 text-[13px]"
        />
      </div>

      {/* Stats Bar */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Links', value: data.totalElements, icon: <Link2 className="h-4 w-4 text-[#818CF8]" />, bg: 'bg-[#6366F1]/10 border-[#6366F1]/20' },
            { label: 'Active', value: shares.filter((s) => s.active).length, icon: <Globe className="h-4 w-4 text-[#34D399]" />, bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Revoked', value: shares.filter((s) => !s.active).length, icon: <Shield className="h-4 w-4 text-rose-400" />, bg: 'bg-rose-500/10 border-rose-500/20' },
          ].map((stat) => (
            <div key={stat.label} className="vault-card p-4 flex items-center gap-3">
              <div className={cn("h-9 w-9 flex items-center justify-center rounded-lg border", stat.bg)}>{stat.icon}</div>
              <div>
                <p className="label-caps text-[9px]">{stat.label}</p>
                <p className="text-xl font-bold text-white mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share List */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
            <p className="text-sm text-[#475569] font-medium">Loading share links…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border border-white/[0.06] rounded-[18px] bg-[#111827]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/[0.03] border border-white/[0.05]">
            <Link2 className="h-6 w-6 text-[#475569]" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">No share links found</p>
            <p className="text-xs text-[#64748B]">Create shared links on your dashboard or files tab.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((share) => {
            const shareUrl = `${window.location.origin}/public/${share.token}`;
            return (
              <div
                key={share.id}
                className={cn(
                  'border rounded-[16px] p-4 bg-[#111827] border-white/[0.06] space-y-3.5 transition-all',
                  !share.active && 'opacity-50'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.03] border border-white/[0.05] shrink-0">
                      <ShareTypeIcon type={share.shareType} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{share.fileName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn(
                          'px-2 py-0.5 rounded-[5px] text-[9px] font-bold text-white uppercase tracking-wide',
                          share.shareType === 'PUBLIC' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          share.shareType === 'PRIVATE' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          share.shareType === 'INTERNAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/[0.04] text-white'
                        )}>
                          {share.shareType}
                        </span>
                        <span className="text-xs text-[#64748B] font-semibold uppercase">{share.permission}</span>
                        {!share.active && (
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Revoked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(share.token)}
                      aria-label="Copy link"
                      className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-white/[0.05] text-[#475569] hover:text-white transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => loadQr(share.id)}
                      aria-label="Toggle QR code"
                      className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-white/[0.05] text-[#475569] hover:text-white transition-colors"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    {share.active && (
                      <button
                        onClick={() => revokeShareMutation.mutate(share.id)}
                        aria-label="Revoke share"
                        className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-amber-500/10 text-amber-400 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteShareMutation.mutate(share.id)}
                      aria-label="Delete share"
                      className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-rose-500/10 text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Share URL */}
                <div className="flex items-center gap-2 bg-[#0F172A] border border-white/[0.06] rounded-[10px] px-3.5 py-2">
                  <span className="text-xs text-[#94A3B8] font-mono flex-1 truncate">{shareUrl}</span>
                  <button onClick={() => copyLink(share.token)} className="shrink-0">
                    <Copy className="h-3.5 w-3.5 text-[#475569] hover:text-white transition-colors" />
                  </button>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-xs text-[#475569] font-medium pt-1">
                  <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> {share.viewCount} views</span>
                  <span className="flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> {share.downloadCount} downloads</span>
                  {share.passwordRequired && <span className="flex items-center gap-1.5 text-amber-400"><Lock className="h-3.5 w-3.5" /> Password protected</span>}
                  {share.downloadLimit !== null && (
                    <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Limit: {share.downloadLimit}</span>
                  )}
                  {share.expiresAt && (
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                  )}
                  <span>Created {new Date(share.createdAt).toLocaleDateString()} by {share.createdByUsername}</span>
                </div>

                {/* QR Code */}
                {qrUrls[share.id] && (
                  <div className="flex justify-start pt-1.5">
                    <img
                      src={qrUrls[share.id]}
                      alt="QR Code for share link"
                      className="h-32 w-32 rounded-lg border border-white/[0.08] bg-white p-2 shadow-vault"
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
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-8 text-xs text-[#94A3B8] border border-white/[0.06] bg-[#0F172A] rounded-[8px] hover:text-white disabled:opacity-50"
          >
            Previous
          </Button>
          <span className="text-xs text-[#475569] font-medium">Page {page + 1} of {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-8 text-xs text-[#94A3B8] border border-white/[0.06] bg-[#0F172A] rounded-[8px] hover:text-white disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
export default SharedPage;
