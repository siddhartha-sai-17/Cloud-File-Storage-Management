import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StorageItem } from '@/features/storage/types';
import { getFileIcon } from '@/features/storage/utils/icons';
import { FavoriteToggle } from './FavoriteToggle';

interface FavoritesTableProps {
  items: StorageItem[];
  selectedIds: Set<number>;
  onItemClick: (item: StorageItem) => void;
  onItemDoubleClick: (item: StorageItem) => void;
  onContextMenu: (e: React.MouseEvent, item: StorageItem) => void;
}

export function FavoritesTable({
  items,
  selectedIds,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
}: FavoritesTableProps) {
  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-md border bg-card">
      <table className="w-full border-collapse text-left text-sm select-none">
        <thead>
          <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
            <th className="p-3 text-xs uppercase tracking-wider">Name</th>
            <th className="p-3 text-xs uppercase tracking-wider">Type</th>
            <th className="p-3 text-xs uppercase tracking-wider">Size</th>
            <th className="p-3 text-xs uppercase tracking-wider">Uploaded Date</th>
            <th className="p-3 text-center text-xs uppercase tracking-wider w-12">Star</th>
            <th className="p-3 text-center text-xs uppercase tracking-wider w-12">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const FileIcon = getFileIcon(item.name, item.type);

            return (
              <tr
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(item);
                }}
                onDoubleClick={() => onItemDoubleClick(item)}
                onContextMenu={(e) => onContextMenu(e, item)}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                  isSelected ? 'bg-primary/5 border-primary/20' : ''
                }`}
              >
                <td className="p-3">
                  <div className="flex items-center gap-3 font-medium overflow-hidden max-w-xs sm:max-w-md">
                    <FileIcon className={`h-5 w-5 ${item.type === 'FOLDER' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">
                  {item.type === 'FOLDER' ? 'Folder' : item.name.split('.').pop()?.toUpperCase() || 'File'}
                </td>
                <td className="p-3 text-muted-foreground">{formatSize(item.size)}</td>
                <td className="p-3 text-muted-foreground">{formatDate(item.createdDate)}</td>
                <td className="p-3 text-center">
                  <FavoriteToggle fileId={item.id} initialStarred={item.starred} />
                </td>
                <td className="p-3 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, item);
                    }}
                    aria-label="Open context menu"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
