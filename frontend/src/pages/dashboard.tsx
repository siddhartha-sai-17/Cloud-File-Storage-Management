import { useStorageAnalytics } from '@/features/storage/hooks/useStorageAnalytics';
import { StorageCards } from '@/features/storage/components/StorageCards';
import { StorageChart } from '@/features/storage/components/StorageChart';
import { RecentFiles } from '@/features/storage/components/RecentFiles';
import { RecentActivity } from '@/features/storage/components/RecentActivity';
import { RefreshCw, HardDrive, Cpu, ShieldCheck, TrendingUp } from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { StatisticCard, WorkspaceHealthWidget } from '@/features/realtime/components/AdvancedDashboardWidgets';
import { useAuth } from '@/contexts/AuthProvider';
import { motion } from 'framer-motion';

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

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

  const storagePercent = storageLimit > 0
    ? ((storageUsed / storageLimit) * 100).toFixed(1)
    : '0.0';

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-[#6366F1]/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-t-2 border-[#6366F1] animate-spin" />
          </div>
          <p className="text-sm text-[#475569] animate-pulse font-medium">
            Loading workspace data…
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16">
        <ErrorState
          title="Dashboard failed to load"
          message={error?.message || 'A network error occurred. Check your connection and try again.'}
          retryAction={refetch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      {/* ── Hero greeting ─────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-1"
        >
          <p className="label-caps">Dashboard · Overview</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {greet()},{' '}
            <span className="gradient-text-accent">
              {user?.username ?? 'there'}
            </span>{' '}
            <span className="inline-block animate-float">👋</span>
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Here's what's happening with your workspace today.
          </p>
        </motion.div>

        <button
          onClick={() => refetch()}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.06] bg-[#0F172A] text-[#475569] hover:text-white hover:border-[#6366F1]/30 hover:bg-[#161F2F] transition-all duration-150"
          title="Refresh dashboard"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── KPI cards ─────────────────────────────────────── */}
      <StorageCards analytics={analytics} storageLimit={storageLimit} />

      {/* ── Charts + Recent files ──────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        <StorageChart used={storageUsed} available={storageAvailable} />
        <RecentFiles onFileDoubleClick={() => {}} />
      </div>

      {/* ── Activity timeline ──────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity />
      </div>

      {/* ── System Intelligence ────────────────────────────── */}
      <div className="space-y-5">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-transparent" />
          <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#0F172A] px-3 py-1">
            <TrendingUp className="h-3 w-3 text-[#6366F1]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569]">
              System Intelligence
            </span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-white/[0.06] via-white/[0.04] to-transparent" />
        </div>

        {/* Intelligence KPI grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatisticCard
            title="Storage Used"
            value={`${storagePercent}%`}
            subtitle={`${(storageUsed / 1_073_741_824).toFixed(2)} GB of ${(storageLimit / 1_073_741_824).toFixed(1)} GB`}
            icon={<HardDrive className="h-5 w-5" />}
            trend={{ value: 'Quota utilization', isPositive: storageUsed < storageLimit * 0.8 }}
          />
          <StatisticCard
            title="Total Files"
            value={analytics?.fileCount ?? '—'}
            subtitle="Indexed in this workspace"
            icon={<Cpu className="h-5 w-5" />}
          />
          <StatisticCard
            title="Storage Saved"
            value={
              analytics?.duplicateSavings != null
                ? `${(analytics.duplicateSavings / 1_048_576).toFixed(1)} MB`
                : '—'
            }
            subtitle="Via deduplication engine"
            icon={<ShieldCheck className="h-5 w-5" />}
            trend={{ value: 'Saved vs raw storage', isPositive: true }}
          />
          <StatisticCard
            title="Free Space"
            value={`${(storageAvailable / 1_073_741_824).toFixed(2)} GB`}
            subtitle="Available in workspace quota"
            icon={<HardDrive className="h-5 w-5" />}
            trend={{
              value: storageAvailable > storageLimit * 0.2 ? 'Healthy headroom' : 'Low quota',
              isPositive: storageAvailable > storageLimit * 0.2,
            }}
          />
        </div>

        {/* Health widget */}
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
