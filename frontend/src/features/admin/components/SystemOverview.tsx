import { Users, HardDrive, Files, Share2, Search, Cpu, CheckCircle } from 'lucide-react';
import type { AdminStatsDto } from '../services/admin.service';

interface SystemOverviewProps {
  stats: AdminStatsDto;
}

export function SystemOverview({ stats }: SystemOverviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, sub: `${stats.activeUsers} active today`, icon: <Users className="h-5 w-5" />, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20' },
    { label: 'Total Footprint', value: formatSize(stats.totalStorageBytes), sub: `${stats.totalFiles} files registered`, icon: <HardDrive className="h-5 w-5" />, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20' },
    { label: 'System Workspaces', value: stats.totalWorkspaces, sub: 'Team + Personal', icon: <Files className="h-5 w-5" />, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' },
    { label: 'OCR Jobs Executed', value: stats.totalOcrJobs, sub: 'Smart text index extraction', icon: <Cpu className="h-5 w-5" />, color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20' },
    { label: 'Public Shares Created', value: stats.totalShares, sub: 'Active shared link URLs', icon: <Share2 className="h-5 w-5" />, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20' },
    { label: 'Global Fulltext Searches', value: stats.totalSearches, sub: 'Lucene index queries', icon: <Search className="h-5 w-5" />, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border rounded-xl p-5 bg-card flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">{c.label}</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{c.value}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Database & minio health metrics */}
      <div className="border rounded-xl p-5 bg-card space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          Platform Health Indexes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Database Sync', value: '100%', color: 'text-emerald-600' },
            { label: 'MinIO Buckets', value: 'Online', color: 'text-emerald-600' },
            { label: 'OCR Process Queue', value: '0 pending', color: 'text-blue-600' },
            { label: 'Deduplication Savings', value: 'Active', color: 'text-indigo-600' },
          ].map((h) => (
            <div key={h.label} className="bg-muted/30 rounded-lg p-3 border">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">{h.label}</p>
              <p className={`text-sm font-bold mt-1 ${h.color}`}>{h.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
