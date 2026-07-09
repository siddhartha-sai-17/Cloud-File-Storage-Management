import { Trash2 } from 'lucide-react';
import { TrashExplorer } from '@/features/trash/components/TrashExplorer';
import { motion } from 'framer-motion';

export function TrashPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="label-caps font-bold">Trash</p>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Trash2 className="h-7 w-7 text-rose-400" />
          Trash Bin
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Manage files and folders you have soft-deleted. Reclaim storage by purging files.
        </p>
      </motion.div>

      <TrashExplorer />
    </div>
  );
}
export default TrashPage;
