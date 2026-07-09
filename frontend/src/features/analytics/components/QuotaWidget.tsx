import { HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuotaWidgetProps {
  used: number;
  quota: number; // in GB
}

export function QuotaWidget({ used, quota }: QuotaWidgetProps) {
  const usedGB = used / (1024 * 1024 * 1024);
  const percentage = Math.min(100, Math.round((usedGB / quota) * 100));

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const isLowSpace = percentage > 85;

  return (
    <div className="vault-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#6366F1]/10 border border-[#6366F1]/20">
            <HardDrive className="h-4.5 w-4.5 text-[#818CF8]" />
          </div>
          <div>
            <p className="label-caps">Limit Info</p>
            <h3 className="text-base font-bold text-white mt-0.5">Workspace Storage Quota</h3>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
          isLowSpace 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
            : 'bg-[#6366F1]/10 border-[#6366F1]/20 text-[#818CF8]'
        }`}>
          {percentage}% Used
        </span>
      </div>

      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${
              isLowSpace ? 'from-rose-500 to-red-500' : 'from-[#6366F1] to-[#8B5CF6]'
            }`}
          />
        </div>

        <div className="flex justify-between text-[11px] font-semibold text-[#475569]">
          <span>{formatSize(used)} Used</span>
          <span>{quota} GB Total</span>
        </div>
      </div>
    </div>
  );
}
