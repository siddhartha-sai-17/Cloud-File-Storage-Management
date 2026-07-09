import type { StorageItem } from '@/features/storage/types';
import { getFileIcon } from '@/features/storage/utils/icons';

interface LargestFilesCardProps {
  files: StorageItem[];
}

export function LargestFilesCard({ files }: LargestFilesCardProps) {
  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <h3 className="text-sm font-bold">Largest Files</h3>
      <div className="divide-y">
        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No large files found</p>
        ) : (
          files.map((file) => {
            const Icon = getFileIcon(file.name, 'FILE');
            return (
              <div key={file.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-xs font-semibold text-foreground max-w-[200px]" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium shrink-0">
                  {formatSize(file.size)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
