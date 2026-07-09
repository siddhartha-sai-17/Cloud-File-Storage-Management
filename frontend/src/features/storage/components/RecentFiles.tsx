import { useQuery } from '@tanstack/react-query';
import { Clock, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getFileIcon } from '../utils/icons';
import { apiClient } from '@/api/axios';
import { type StorageItem, type PageResponse } from '../types';
import { cn } from '@/utils/utils';

interface RecentFilesProps {
  onFileDoubleClick: (file: StorageItem) => void;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  doc: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  docx: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  xls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  xlsx: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  jpg: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  jpeg: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  png: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  mp4: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  zip: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

const getExt = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

export function RecentFiles({ onFileDoubleClick }: RecentFilesProps) {
  const { data: recentPage, isLoading } = useQuery({
    queryKey: ['recent-files'],
    queryFn: async () => {
      const response = await apiClient.get<PageResponse<StorageItem>>('/api/recent', {
        params: { type: 'ALL', page: 0, size: 5 },
      });
      return response.data;
    },
  });

  const files = recentPage?.content || [];

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '—';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden col-span-1 md:col-span-2">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">Recent Files</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Last 5</span>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size={24} />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No recent files</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.name, 'FILE');
              const ext = getExt(file.name);
              const colorClass = FILE_TYPE_COLORS[ext] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/20';
              return (
                <div
                  key={file.id}
                  onDoubleClick={() => onFileDoubleClick(file)}
                  className="group flex items-center justify-between rounded-xl p-2.5 hover:bg-white/5 transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", colorClass)}>
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <span className="truncate text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-xs text-gray-600 tabular-nums">{formatSize(file.size)}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
