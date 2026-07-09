import { Sparkles, Trash2, ArrowUpRight, Zap } from 'lucide-react';
import type { StorageItem } from '@/features/storage/types';
import { motion } from 'framer-motion';

interface StorageInsightsProps {
  growthRate: number;
  largestFiles: StorageItem[];
  storageUsed: number;
}

const formatSize = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  if (mb > 1024) {
    return (mb / 1024).toFixed(2) + ' GB';
  }
  return mb.toFixed(2) + ' MB';
};

export function StorageInsights({ growthRate, largestFiles, storageUsed }: StorageInsightsProps) {
  const hasLargeFiles = largestFiles.some((f) => (f.size || 0) > 100 * 1024 * 1024); // >100MB

  return (
    <div className="vault-card p-5 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#6366F1]/10 border border-[#6366F1]/20">
          <Sparkles className="h-4.5 w-4.5 text-[#818CF8]" />
        </div>
        <div>
          <p className="label-caps">Workspace Intelligence</p>
          <h3 className="text-base font-bold text-white mt-0.5">Storage Insights & Recommendations</h3>
        </div>
      </div>

      <div className="space-y-3">
        {growthRate > 10 && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3.5 rounded-[12px] bg-amber-500/10 text-amber-400 border border-amber-500/20"
          >
            <ArrowUpRight className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-bold">High Growth Rate Detected</p>
              <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                Storage utilization grew by {growthRate.toFixed(1)}% this month. Consider checking for duplicate
                uploads or request additional storage quota.
              </p>
            </div>
          </motion.div>
        )}

        {hasLargeFiles && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3.5 rounded-[12px] bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20"
          >
            <Trash2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-bold">Large Files Clean-up Opportunity</p>
              <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                You have files exceeding 100 MB in size. Moving unused large files to trash could instantly free up
                significant workspace storage.
              </p>
            </div>
          </motion.div>
        )}

        {storageUsed === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3.5 rounded-[12px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            <Zap className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-bold">Ready to Start</p>
              <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                Your workspace is empty. Try uploading large files or creating project folders to activate smart storage
                insights.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3.5 rounded-[12px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            <Zap className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-bold">Workspace Healthy</p>
              <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                Storage index is healthy. Deduplication engines are running. Total consumed size is {formatSize(storageUsed)}.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
