import { useQuery } from '@tanstack/react-query';
import { Activity, Upload, Download, Trash2, FolderPlus, Share2, Eye } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthProvider';
import { apiClient } from '@/api/axios';
import { type ActivityTimelineItem, type PageResponse } from '../types';

const ACTION_ICONS: Record<string, React.ElementType> = {
  UPLOAD: Upload,
  DOWNLOAD: Download,
  DELETE: Trash2,
  CREATE_FOLDER: FolderPlus,
  SHARE: Share2,
  VIEW: Eye,
};

const ACTION_COLORS: Record<string, string> = {
  UPLOAD: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  DOWNLOAD: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  CREATE_FOLDER: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  SHARE: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  VIEW: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
};

export function RecentActivity() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: activityPage, isLoading } = useQuery({
    queryKey: ['recent-activity', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiClient.get<PageResponse<ActivityTimelineItem>>(`/api/activity/user/${userId}`, {
        params: { page: 0, size: 6 },
      });
      return response.data;
    },
    enabled: !!userId,
  });

  const activities = activityPage?.content || [];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden col-span-1 md:col-span-2">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
            <Activity className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">Activity</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Timeline</span>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size={24} />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Activity className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No activity yet</p>
          </div>
        ) : (
          <div className="relative space-y-1">
            {/* vertical guide line */}
            <div className="absolute left-[19px] top-0 h-full w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
            {activities.map((act) => {
              const actionKey = act.entityType?.toUpperCase() ?? 'VIEW';
              const Icon = ACTION_ICONS[actionKey] ?? Eye;
              const colorClass = ACTION_COLORS[actionKey] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/20';
              return (
                <div key={act.id} className="group flex items-start gap-3 rounded-xl p-2 hover:bg-white/5 transition-all">
                  <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border mt-0.5 ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-sm text-gray-200 truncate font-medium leading-snug">{act.description}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5 capitalize">
                      {act.status?.toLowerCase()} · {act.entityType}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-600 tabular-nums shrink-0 mt-0.5">{formatDate(act.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
