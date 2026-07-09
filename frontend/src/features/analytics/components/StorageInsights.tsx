import { Sparkles, Trash2, ArrowUpRight, Zap } from 'lucide-react';
import type { StorageItem } from '@/features/storage/types';

interface StorageInsightsProps {
  growthRate: number;
  largestFiles: StorageItem[];
  storageUsed: number;
}

export function StorageInsights({ growthRate, largestFiles, storageUsed }: StorageInsightsProps) {
  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(2) + ' MB';
  };

  const hasLargeFiles = largestFiles.some((f) => (f.size || 0) > 100 * 1024 * 1024); // >100MB

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center gap-2 text-indigo-600">
        <Sparkles className="h-5 w-5" />
        <h3 className="text-sm font-bold">Storage Insights & Recommendations</h3>
      </div>

      <div className="space-y-3">
        {growthRate > 10 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50">
            <ArrowUpRight className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">High Growth Rate Detected</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Storage utilization grew by {growthRate.toFixed(1)}% this month. Consider checking for duplicate
                uploads or request additional storage quota.
              </p>
            </div>
          </div>
        )}

        {hasLargeFiles && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/50">
            <Trash2 className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Large Files Clean-up Opportunity</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                You have files exceeding 100 MB in size. Moving unused large files to trash could instantly free up
                significant workspace storage.
              </p>
            </div>
          </div>
        )}

        {storageUsed === 0 ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50">
            <Zap className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Ready to Start</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Your workspace is empty. Try uploading large files or creating project folders to activate smart storage
                insights.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50">
            <Zap className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Workspace Healthy</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Storage index is healthy. Deduplication engines are running. Total consumed size is {formatSize(storageUsed)}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
