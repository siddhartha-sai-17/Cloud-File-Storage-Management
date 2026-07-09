import { Clock } from 'lucide-react';
import { RecentFiles } from '@/features/recent/components/RecentFiles';
import { motion } from 'framer-motion';

export function RecentPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="label-caps font-bold">Activity Log</p>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Clock className="h-7 w-7 text-[#6366F1]" />
          Recent Files
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Review files you recently uploaded, opened, modified, or shared.
        </p>
      </motion.div>

      <RecentFiles />
    </div>
  );
}
export default RecentPage;
