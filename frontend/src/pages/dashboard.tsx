import { useStorageAnalytics } from '@/features/storage/hooks/useStorageAnalytics';
import { StorageCards } from '@/features/storage/components/StorageCards';
import { StorageChart } from '@/features/storage/components/StorageChart';
import { RecentFiles } from '@/features/storage/components/RecentFiles';
import { RecentActivity } from '@/features/storage/components/RecentActivity';
import { RefreshCw, HardDrive, Cpu, ShieldCheck, TrendingUp, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/ui/error-state';
import { StatisticCard, WorkspaceHealthWidget } from '@/features/realtime/components/AdvancedDashboardWidgets';
import { useAuth } from '@/contexts/AuthProvider';

export function DashboardPage() {
  const { user } = useAuth();
  const {
    analytics,
    storageUsed,
    storageAvailable,
    storageLimit,
    isLoading,
    isError,
    error,
    refetch,
  } = useStorageAnalytics();

  const storagePercent = ((storageUsed / (storageLimit || 1)) * 100).toFixed(1);

  if (isLoading) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size={36} />
          <p className="text-sm text-gray-500 animate-pulse">Loading dashboard statistics...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12">
        <ErrorState
          title="Dashboard loading error"
          message={error?.message || 'A network error occurred. Please verify your connection.'}
          retryAction={refetch}
        />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
            <LayoutDashboard className="h-3 w-3" />
            Overview
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {greeting}, {user?.username ?? 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your workspace today.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          title="Refresh dashboard"
          className="text-gray-500 hover:text-white hover:bg-white/5 rounded-xl"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Storage KPI cards */}
      <StorageCards analytics={analytics} storageLimit={storageLimit} />

      {/* Charts + Recent Files */}
      <div className="grid gap-6 md:grid-cols-3">
        <StorageChart used={storageUsed} available={storageAvailable} />
        <RecentFiles onFileDoubleClick={() => {}} />
      </div>

      {/* Activity Timeline */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity />
      </div>

      {/* System Intelligence section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-white/8 via-white/4 to-transparent" />
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <TrendingUp className="h-3 w-3" />
            System Intelligence
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-white/8 via-white/4 to-transparent" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatisticCard
            title="Storage Used"
            value={`${storagePercent}%`}
            subtitle={`${(storageUsed / 1_073_741_824).toFixed(2)} GB of ${(storageLimit / 1_073_741_824).toFixed(1)} GB`}
            icon={<HardDrive className="h-4 w-4" />}
            trend={{ value: 'Quota utilization', isPositive: storageUsed < storageLimit * 0.8 }}
          />
          <StatisticCard
            title="Total Files"
            value={analytics?.fileCount ?? '—'}
            subtitle="Indexed in this workspace"
            icon={<Cpu className="h-4 w-4" />}
          />
          <StatisticCard
            title="Storage Saved"
            value={analytics?.duplicateSavings != null
              ? `${(analytics.duplicateSavings / 1_048_576).toFixed(1)} MB`
              : '—'
            }
            subtitle="Via deduplication engine"
            icon={<ShieldCheck className="h-4 w-4" />}
            trend={{ value: 'Saved vs raw storage', isPositive: true }}
          />
          <StatisticCard
            title="Free Space"
            value={`${(storageAvailable / 1_073_741_824).toFixed(2)} GB`}
            subtitle="Available in workspace quota"
            icon={<HardDrive className="h-4 w-4" />}
            trend={{
              value: storageAvailable > storageLimit * 0.2 ? 'Healthy headroom' : 'Low quota warning',
              isPositive: storageAvailable > storageLimit * 0.2,
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <WorkspaceHealthWidget
            usedPercent={(storageUsed / (storageLimit || 1)) * 100}
            ocrSuccessPercent={99.0}
            queueHealth="HEALTHY"
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
