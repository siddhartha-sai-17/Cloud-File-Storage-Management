import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics';
import { StorageOverview } from '@/features/analytics/components/StorageOverview';
import { StorageUsageChart } from '@/features/analytics/components/StorageUsageChart';
import { StorageTrendChart } from '@/features/analytics/components/StorageTrendChart';
import { FileTypeChart } from '@/features/analytics/components/FileTypeChart';
import { LargestFilesCard } from '@/features/analytics/components/LargestFilesCard';
import { StorageInsights } from '@/features/analytics/components/StorageInsights';
import { QuotaWidget } from '@/features/analytics/components/QuotaWidget';
import { BarChart2, RefreshCw } from 'lucide-react';

export function AnalyticsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const { analytics, isLoading, refetch } = useAnalytics(activeWorkspaceId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <span>Loading workspace analytics…</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-indigo-600" />
            Storage Intelligence & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time analytics, file category breakdowns, growth patterns, and workspace usage quotas.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
          title="Refresh"
          aria-label="Refresh analytics data"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {analytics ? (
        <div className="space-y-6">
          <StorageOverview
            usedBytes={analytics.storageUsed}
            growthPercentage={analytics.growthPercentage}
            largestCount={analytics.largestFiles?.length || 0}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StorageUsageChart data={analytics.storageByOwner} />
            <FileTypeChart data={analytics.storageByFileType} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StorageTrendChart data={analytics.dailyUploadGraph} title="Daily Upload Volumetrics" />
            <StorageTrendChart data={analytics.monthlyUploadGraph} title="Monthly Growth Pattern" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuotaWidget used={analytics.storageUsed} quota={10} />
            <LargestFilesCard files={analytics.largestFiles || []} />
          </div>

          <StorageInsights
            growthRate={analytics.growthPercentage}
            largestFiles={analytics.largestFiles || []}
            storageUsed={analytics.storageUsed}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
          No analytics payload returned for the current active workspace.
        </div>
      )}
    </div>
  );
}
export default AnalyticsPage;
