import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/axios';
import { useRealtime } from '@/contexts/RealtimeProvider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle, XCircle, Wifi, WifiOff, RefreshCw,
  HardDrive, Activity, Users, FileText, AlertTriangle,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminStats {
  totalUsers?: number;
  totalFiles?: number;
  totalStorageBytes?: number;
  totalWorkspaces?: number;
  activeUsers?: number;
}

interface DuplicateStats {
  totalGroups?: number;
  totalWastedBytes?: number;
  potentialSavingsBytes?: number;
}

function HealthBadge({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-card">
      <div className="flex items-center gap-2">
        {ok
          ? <CheckCircle className="h-4 w-4 text-emerald-500" />
          : <XCircle className="h-4 w-4 text-destructive" />}
        <span className="text-xs font-medium">{label}</span>
      </div>
      {detail && <span className="text-[10px] text-muted-foreground">{detail}</span>}
    </div>
  );
}

function formatBytes(bytes?: number) {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function MonitoringDashboard() {
  const { status: wsStatus } = useRealtime();

  // GET /api/health
  const { data: healthData, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ['monitoring-health'],
    queryFn: async () => {
      const res = await apiClient.get<string>('/api/health');
      return res.data;
    },
    refetchInterval: 30_000,
    retry: 2,
  });

  // GET /api/admin/stats
  const { data: adminStats, isLoading: statsLoading } = useQuery({
    queryKey: ['monitoring-admin-stats'],
    queryFn: async () => {
      const res = await apiClient.get<AdminStats>('/api/admin/stats');
      return res.data;
    },
    refetchInterval: 60_000,
    retry: 1,
  });

  // GET /api/admin/duplicates/stats
  const { data: dupStats } = useQuery({
    queryKey: ['monitoring-dup-stats'],
    queryFn: async () => {
      const res = await apiClient.get<DuplicateStats>('/api/admin/duplicates/stats');
      return res.data;
    },
    refetchInterval: 120_000,
    retry: 1,
  });

  const apiHealthy = !healthError && healthData === 'OK';
  const wsConnected = wsStatus === 'CONNECTED';

  // Build chart data from available admin stats (static shape for display)
  const storageGb = adminStats?.totalStorageBytes
    ? (adminStats.totalStorageBytes / 1_073_741_824)
    : 0;

  const chartData = [
    { name: 'Storage', value: storageGb },
    { name: 'Files', value: (adminStats?.totalFiles ?? 0) / 100 },
    { name: 'Users', value: adminStats?.totalUsers ?? 0 },
    { name: 'Workspaces', value: adminStats?.totalWorkspaces ?? 0 },
  ];

  const loading = healthLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            System Monitoring & Diagnostics
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Live telemetry from verified backend endpoints only.
          </p>
        </div>
        <button
          onClick={() => refetchHealth()}
          className="h-7 w-7 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
          aria-label="Refresh monitoring data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <LoadingSpinner size={14} />
          <span>Refreshing diagnostics...</span>
        </div>
      )}

      {/* Health Status Grid */}
      <div>
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          System Health
        </h4>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <HealthBadge
            label="REST API"
            ok={apiHealthy}
            detail={apiHealthy ? 'Healthy — /api/health' : 'Unreachable'}
          />
          <HealthBadge
            label="WebSocket"
            ok={wsConnected}
            detail={wsStatus}
          />
          <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-card">
            <div className="flex items-center gap-2">
              {wsConnected
                ? <Wifi className="h-4 w-4 text-emerald-500" />
                : <WifiOff className="h-4 w-4 text-amber-500" />}
              <span className="text-xs font-medium">Upload Channel</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{wsStatus}</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div>
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Platform Metrics
        </h4>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Users</span>
              </div>
              <p className="text-xl font-bold">{adminStats?.totalUsers ?? '—'}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Files</span>
              </div>
              <p className="text-xl font-bold">{adminStats?.totalFiles ?? '—'}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Storage</span>
              </div>
              <p className="text-xl font-bold">{formatBytes(adminStats?.totalStorageBytes)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] uppercase tracking-wider">Dup Waste</span>
              </div>
              <p className="text-xl font-bold">{formatBytes(dupStats?.totalWastedBytes)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deduplication Savings */}
      {dupStats && (
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Deduplication Engine
          </h4>
          <div className="border rounded-lg p-3 bg-card space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Duplicate Groups Found</span>
              <span className="font-semibold">{dupStats.totalGroups ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Potential Savings</span>
              <span className="font-semibold text-emerald-600">{formatBytes(dupStats.potentialSavingsBytes)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Wasted Storage</span>
              <span className="font-semibold text-amber-600">{formatBytes(dupStats.totalWastedBytes)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini Summary Chart */}
      {adminStats && (
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Platform Overview (Snapshot)
          </h4>
          <div className="border rounded-lg p-3 bg-card h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="monitorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#monitorGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        Data sourced from: /api/health, /api/admin/stats, /api/admin/duplicates/stats
      </p>
    </div>
  );
}
