import { Clock, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { StorageItem } from '@/features/storage/types';
import { getFileIcon } from '@/features/storage/utils/icons';
import { FavoriteToggle } from '@/features/favorites/components/FavoriteToggle';

interface RecentActivityCardProps {
  item: StorageItem;
  onPreview: (item: StorageItem) => void;
}

export function RecentActivityCard({ item, onPreview }: RecentActivityCardProps) {
  const FileIcon = getFileIcon(item.name, 'FILE');

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="hover:shadow-md transition-all select-none border">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
            <FileIcon className="h-6 w-6" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold truncate" title={item.name}>
              {item.name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.createdDate ? new Date(item.createdDate).toLocaleDateString() : '-'}
              </span>
              <span>•</span>
              <span>{formatSize(item.size)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <FavoriteToggle fileId={item.id} initialStarred={item.starred} />
          <button
            onClick={() => onPreview(item)}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Preview file"
            aria-label={`Preview ${item.name}`}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
