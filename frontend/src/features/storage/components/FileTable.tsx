import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type StorageItem } from '../types';
import { getFileIcon } from '../utils/icons';
import { FavoriteToggle } from '@/features/favorites/components/FavoriteToggle';
import { useVirtualList } from '@/hooks/useVirtualList';
import { cn } from '@/utils/utils';

interface FileTableProps {
  items: StorageItem[];
  selectedIds: Set<number>;
  onItemClick: (item: StorageItem) => void;
  onItemDoubleClick: (item: StorageItem) => void;
  onContextMenu: (e: React.MouseEvent, item: StorageItem) => void;
  onToggleStar: (id: number) => void;
}

export function FileTable({
  items,
  selectedIds,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
}: FileTableProps) {
  const ROW_HEIGHT = 56;

  // Integrate virtualized list hook
  const { containerRef, virtualItems } = useVirtualList(items, {
    itemHeight: ROW_HEIGHT,
    overscan: 10,
  });

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  const getFileIconColor = (name: string, type: 'FILE' | 'FOLDER') => {
    if (type === 'FOLDER') return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
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

  const startIndex = virtualItems.length > 0 ? virtualItems[0].index : 0;
  const endIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;

  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (items.length - endIndex - 1) * ROW_HEIGHT);

  return (
    <div 
      ref={containerRef}
      className="w-full max-h-[600px] overflow-y-auto rounded-xl border border-[#1e293b]/40 bg-[#151b2f]/60 backdrop-blur-sm relative shadow-xl"
      role="region"
      aria-label="Files table list viewer"
    >
      <table className="w-full border-collapse text-left text-sm select-none">
        <thead className="sticky top-0 z-10 bg-[#111827] border-b border-[#1e293b]/50 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
          <tr className="font-semibold text-gray-400 text-xs uppercase tracking-wider">
            <th className="p-3.5 pl-4">Name</th>
            <th className="p-3.5">Type</th>
            <th className="p-3.5">Size</th>
            <th className="p-3.5">Uploaded Date</th>
            <th className="p-3.5 text-center w-12">Star</th>
            <th className="p-3.5 text-center w-12 pl-1">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e293b]/30">
          {/* Top Virtual Spacer */}
          {topSpacerHeight > 0 && (
            <tr style={{ height: `${topSpacerHeight}px` }}>
              <td colSpan={6} className="p-0 border-none" />
            </tr>
          )}

          {/* Sliced Virtual Items */}
          {virtualItems.map(({ item }) => {
            const isSelected = selectedIds.has(item.id);
            const FileIcon = getFileIcon(item.name, item.type);
            const iconStyles = getFileIconColor(item.name, item.type);
            
            return (
              <tr
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(item);
                }}
                onDoubleClick={() => onItemDoubleClick(item)}
                onContextMenu={(e) => onContextMenu(e, item)}
                style={{ height: `${ROW_HEIGHT}px` }}
                className={cn(
                  "group cursor-pointer transition-all duration-150 border-l-2",
                  isSelected 
                    ? "bg-[#6366f1]/10 border-[#6366f1] text-white" 
                    : "border-transparent hover:bg-white/5 text-gray-300 hover:text-white"
                )}
              >
                <td className="p-3 pl-4">
                  <div className="flex items-center gap-3 font-semibold overflow-hidden max-w-xs sm:max-w-md">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border shrink-0", iconStyles)}>
                      <FileIcon className="h-4.5 w-4.5" />
                    </div>
                    <span className="truncate">{item.name}</span>
                  </div>
                </td>
                <td className="p-3 text-gray-400 font-medium">
                  {item.type === 'FOLDER' ? 'Folder' : item.name.split('.').pop()?.toUpperCase() || 'File'}
                </td>
                <td className="p-3 text-gray-400 font-semibold">{formatSize(item.size)}</td>
                <td className="p-3 text-gray-400 font-medium">{formatDate(item.createdDate)}</td>
                <td className="p-3 text-center">
                  {item.type === 'FILE' && (
                    <FavoriteToggle fileId={item.id} initialStarred={item.starred} />
                  )}
                </td>
                <td className="p-3 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, item);
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}

          {/* Bottom Virtual Spacer */}
          {bottomSpacerHeight > 0 && (
            <tr style={{ height: `${bottomSpacerHeight}px` }}>
              <td colSpan={6} className="p-0 border-none" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export default FileTable;
