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
import { motion } from 'framer-motion';

export function AnalyticsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const { analytics, isLoading, refetch } = useAnalytics(activeWorkspaceId);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-[#6366F1]/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-t-2 border-[#6366F1] animate-spin" />
          </div>
          <p className="text-sm text-[#475569] animate-pulse font-medium">
            Loading analytics dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex items-start justify-between">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="label-caps">Enterprise Insights</p>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart2 className="h-7 w-7 text-[#6366F1]" />
            Storage Analytics
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time analytics, file category breakdowns, growth patterns, and workspace usage quotas.
          </p>
        </motion.div>

        <button
          onClick={() => refetch()}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.06] bg-[#0F172A] text-[#475569] hover:text-white hover:border-[#6366F1]/30 hover:bg-[#161F2F] transition-all duration-150"
          title="Refresh analytics data"
          aria-label="Refresh analytics data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {analytics ? (
        <div className="space-y-8">
          {/* Overviews */}
          <StorageOverview
            usedBytes={analytics.storageUsed}
            growthPercentage={analytics.growthPercentage}
            largestCount={analytics.largestFiles?.length || 0}
          />

          {/* Section Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569]">
              Distribution Breakdowns
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-white/[0.06] via-white/[0.04] to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StorageUsageChart data={analytics.storageByOwner} />
            <FileTypeChart data={analytics.storageByFileType} />
          </div>

          {/* Section Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569]">
              Growth Volumetrics
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-white/[0.06] via-white/[0.04] to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StorageTrendChart data={analytics.dailyUploadGraph} title="Daily Upload Volumetrics" />
            <StorageTrendChart data={analytics.monthlyUploadGraph} title="Monthly Growth Pattern" />
          </div>

          {/* Section Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569]">
              Quota & Clean-up Insights
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-white/[0.06] via-white/[0.04] to-transparent" />
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
        <div className="vault-card p-12 text-center text-[#475569] font-medium">
          No analytics payload returned for the current active workspace.
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
