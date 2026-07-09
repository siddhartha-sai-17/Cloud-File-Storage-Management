import { MoreVertical, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type StorageItem } from '../types';
import { getFileIcon } from '../utils/icons';
import { FavoriteToggle } from '@/features/favorites/components/FavoriteToggle';
import { useVirtualList } from '@/hooks/useVirtualList';
import { cn } from '@/utils/utils';
import { motion } from 'framer-motion';

interface FileGridProps {
  items: StorageItem[];
  selectedIds: Set<number>;
  onItemClick: (item: StorageItem) => void;
  onItemDoubleClick: (item: StorageItem) => void;
  onContextMenu: (e: React.MouseEvent, item: StorageItem) => void;
  onToggleStar: (id: number) => void;
}

export function FileGrid({
  items,
  selectedIds,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
}: FileGridProps) {
  const folders = items.filter((i) => i.type === 'FOLDER');
  const files = items.filter((i) => i.type === 'FILE');

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIconColor = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
      case 'pdf':
      case 'doc':
      case 'docx':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'mp4':
      case 'mkv':
      case 'mov':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
      case '7z':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  // Chunk files into rows of 4 for virtualized rows layout
  const CHUNK_SIZE = 4;
  const fileRows = [];
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    fileRows.push(files.slice(i, i + CHUNK_SIZE));
  }

  const FILE_ROW_HEIGHT = 180;
  const { containerRef, virtualItems, totalHeight } = useVirtualList(fileRows, {
    itemHeight: FILE_ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div 
      className="space-y-6 max-h-[600px] overflow-y-auto p-2 border border-[#1e293b]/40 rounded-xl bg-[#0b0f19]/40 backdrop-blur-sm shadow-inner" 
      ref={containerRef}
    >
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="p-1">
          <h3 className="mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {folders.map((folder, index) => {
              const isSelected = selectedIds.has(folder.id);
              return (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <Card
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(folder);
                    }}
                    onDoubleClick={() => onItemDoubleClick(folder)}
                    onContextMenu={(e) => onContextMenu(e, folder)}
                    className={cn(
                      "cursor-pointer border select-none transition-all duration-200 glow-border rounded-xl shadow-md",
                      isSelected 
                        ? "border-indigo-500 bg-indigo-500/10 text-white" 
                        : "bg-[#151b2f] border-[#1e293b]/40 text-gray-300 hover:text-white"
                    )}
                  >
                    <CardContent className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 shrink-0">
                          <Folder className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                        </div>
                        <span className="truncate text-xs font-semibold leading-none">{folder.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onContextMenu(e, folder);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div className="p-1">
          <h3 className="mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Files ({files.length})
          </h3>
          <div 
            style={{ height: `${totalHeight}px`, position: 'relative' }} 
            className="w-full"
          >
            {virtualItems.map(({ item: rowFiles, offsetTop }) => (
              <div
                key={offsetTop}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${offsetTop}px)`,
                  height: `${FILE_ROW_HEIGHT}px`,
                }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full"
              >
                {rowFiles.map((file, fileIdx) => {
                  const isSelected = selectedIds.has(file.id);
                  const FileIcon = getFileIcon(file.name, 'FILE');
                  const iconStyles = getFileIconColor(file.name);
                  
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: fileIdx * 0.03 }}
                    >
                      <Card
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemClick(file);
                        }}
                        onDoubleClick={() => onItemDoubleClick(file)}
                        onContextMenu={(e) => onContextMenu(e, file)}
                        className={cn(
                          "cursor-pointer overflow-hidden border select-none transition-all duration-200 glow-border h-[162px] rounded-xl shadow-md",
                          isSelected 
                            ? "border-indigo-500 bg-indigo-500/10 text-white" 
                            : "bg-[#151b2f] border-[#1e293b]/40 text-gray-300 hover:text-white"
                        )}
                      >
                        <div className="flex h-20 items-center justify-center bg-[#0b0f19]/60 p-2 relative group-hover:bg-[#0b0f19]/40 border-b border-[#1e293b]/20">
                          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner", iconStyles)}>
                            <FileIcon className="h-6 w-6" />
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-1">
                            <div className="overflow-hidden min-w-0 flex-1">
                              <p className="truncate text-xs font-bold leading-tight mb-1">{file.name}</p>
                              <p className="text-[10px] text-gray-500 font-semibold">{formatSize(file.size)}</p>
                            </div>
                            <div className="flex items-center shrink-0 gap-0.5">
                              <FavoriteToggle fileId={file.id} initialStarred={file.starred} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6.5 w-6.5 text-gray-400 hover:text-white p-0 hover:bg-white/5 rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContextMenu(e, file);
                                }}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default FileGrid;
