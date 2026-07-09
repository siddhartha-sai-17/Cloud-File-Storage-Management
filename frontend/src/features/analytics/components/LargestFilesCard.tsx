import type { StorageItem } from '@/features/storage/types';
import { getFileIcon } from '@/features/storage/utils/icons';
import { FileX } from 'lucide-react';

interface LargestFilesCardProps {
  files: StorageItem[];
}

const formatSize = (bytes: number | null) => {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function LargestFilesCard({ files }: LargestFilesCardProps) {
  const maxSize = files[0]?.size ?? 1;

  return (
    <div className="vault-card p-5 space-y-4">
      <div>
        <p className="label-caps">Top Items</p>
        <h3 className="text-base font-bold text-white mt-1">Largest Files</h3>
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/[0.04] border border-white/[0.06]">
            <FileX className="h-5 w-5 text-[#475569]" />
          </div>
          <p className="text-[12px] text-[#475569] font-medium">No large files found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.name, 'FILE');
            const pct = maxSize > 0 && file.size ? (file.size / maxSize) * 100 : 0;
            return (
              <div
                key={file.id}
                className="group flex items-center gap-3 rounded-[10px] p-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-[10px] font-bold text-[#334155] w-4 shrink-0 text-right">
                  {i + 1}
                </span>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#6366F1]/10 border border-[#6366F1]/20">
                  <Icon className="h-3.5 w-3.5 text-[#818CF8]" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="truncate text-[12px] font-semibold text-[#94A3B8] group-hover:text-white transition-colors">
                    {file.name}
                  </p>
                  <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] text-[#475569] font-bold tabular-nums shrink-0">
                  {formatSize(file.size)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
