import { MoreVertical, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const formatSize = (bytes: number | null) => {
  if (bytes === null) return '—';
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
      return 'file-other';
    case 'pdf':
      return 'file-pdf';
    case 'doc':
    case 'docx':
      return 'file-doc';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return 'file-image';
    case 'mp4':
    case 'mkv':
    case 'mov':
      return 'file-video';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'file-sheet';
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return 'file-zip';
    default:
      return 'file-other';
  }
};

export function FileGrid({
  items,
  selectedIds,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
}: FileGridProps) {
  const folders = items.filter((i) => i.type === 'FOLDER');
  const files = items.filter((i) => i.type === 'FILE');

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
      className="space-y-6 max-h-[600px] overflow-y-auto p-4 border border-white/[0.05] rounded-[18px] bg-[#0A0E1A]/40 backdrop-blur-md shadow-inner" 
      ref={containerRef}
    >
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.12em]">
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
                  transition={{ duration: 0.2, delay: index * 0.01 }}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(folder);
                    }}
                    onDoubleClick={() => onItemDoubleClick(folder)}
                    onContextMenu={(e) => onContextMenu(e, folder)}
                    className={cn(
                      "group flex items-center justify-between p-3 cursor-pointer border select-none transition-all duration-150 rounded-[14px]",
                      isSelected 
                        ? "border-[#6366F1] bg-[#6366F1]/10 text-white shadow-vault-sm" 
                        : "bg-[#111827] border-white/[0.06] text-[#94A3B8] hover:text-white hover:border-[#6366F1]/20 hover:bg-[#161F2F]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#6366F1]/12 border border-[#6366F1]/20 shrink-0">
                        <Folder className="h-4.5 w-4.5 text-[#818CF8]" />
                      </div>
                      <span className="truncate text-[12px] font-semibold">{folder.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#475569] hover:text-white hover:bg-white/[0.05] rounded-[6px] shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, folder);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.12em]">
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
                  const badgeClass = getFileIconColor(file.name);
                  
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: fileIdx * 0.02 }}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemClick(file);
                        }}
                        onDoubleClick={() => onItemDoubleClick(file)}
                        onContextMenu={(e) => onContextMenu(e, file)}
                        className={cn(
                          "group cursor-pointer overflow-hidden border select-none transition-all duration-150 h-[162px] rounded-[16px] flex flex-col justify-between",
                          isSelected 
                            ? "border-[#6366F1] bg-[#6366F1]/10 text-white shadow-vault-sm" 
                            : "bg-[#111827] border-white/[0.06] text-[#94A3B8] hover:text-white hover:border-[#6366F1]/20 hover:bg-[#161F2F]"
                        )}
                      >
                        {/* Upper Preview Area */}
                        <div className="flex h-20 items-center justify-center bg-white/[0.02] border-b border-white/[0.04] p-3 relative">
                          <div className={cn("flex h-11 w-11 items-center justify-center rounded-[10px] border shadow-inner transition-transform group-hover:scale-105 duration-200", badgeClass)}>
                            <FileIcon className="h-5.5 w-5.5" />
                          </div>
                        </div>

                        {/* Card metadata content */}
                        <div className="p-3 space-y-1">
                          <p className="truncate text-[12px] font-bold text-white leading-tight">
                            {file.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#475569] font-semibold">
                              {formatSize(file.size)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <FavoriteToggle fileId={file.id} initialStarred={file.starred} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-[#475569] hover:text-white hover:bg-white/[0.06] rounded-[6px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContextMenu(e, file);
                                }}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
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
