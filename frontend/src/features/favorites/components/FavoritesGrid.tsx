import { MoreVertical, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { StorageItem } from '@/features/storage/types';
import { getFileIcon } from '@/features/storage/utils/icons';
import { FavoriteToggle } from './FavoriteToggle';

interface FavoritesGridProps {
  items: StorageItem[];
  selectedIds: Set<number>;
  onItemClick: (item: StorageItem) => void;
  onItemDoubleClick: (item: StorageItem) => void;
  onContextMenu: (e: React.MouseEvent, item: StorageItem) => void;
}

export function FavoritesGrid({
  items,
  selectedIds,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
}: FavoritesGridProps) {
  const folders = items.filter((i) => i.type === 'FOLDER');
  const files = items.filter((i) => i.type === 'FILE');

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Folders
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {folders.map((folder) => {
              const isSelected = selectedIds.has(folder.id);
              return (
                <Card
                  key={folder.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemClick(folder);
                  }}
                  onDoubleClick={() => onItemDoubleClick(folder)}
                  onContextMenu={(e) => onContextMenu(e, folder)}
                  className={`cursor-pointer border select-none transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-card'
                  }`}
                >
                  <CardContent className="flex items-center justify-between p-4 gap-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Folder className="h-6 w-6 text-blue-500 shrink-0" />
                      <span className="truncate text-sm font-medium">{folder.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, folder);
                      }}
                      aria-label="Open folder options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Files
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {files.map((file) => {
              const isSelected = selectedIds.has(file.id);
              const FileIcon = getFileIcon(file.name, 'FILE');
              return (
                <Card
                  key={file.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemClick(file);
                  }}
                  onDoubleClick={() => onItemDoubleClick(file)}
                  onContextMenu={(e) => onContextMenu(e, file)}
                  className={`cursor-pointer border select-none transition-all hover:shadow-md flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-card'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col h-full gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-medium" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        <FavoriteToggle fileId={file.id} initialStarred={file.starred} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onContextMenu(e, file);
                          }}
                          aria-label="Open file options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
