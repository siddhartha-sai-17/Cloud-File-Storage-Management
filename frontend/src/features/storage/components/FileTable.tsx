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

const formatSize = (bytes: number | null) => {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
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
  if (type === 'FOLDER') return 'file-folder';
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

export function FileTable({
  items,
  selectedIds,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
}: FileTableProps) {
  const ROW_HEIGHT = 52;

  // Integrate virtualized list hook
  const { containerRef, virtualItems } = useVirtualList(items, {
    itemHeight: ROW_HEIGHT,
    overscan: 10,
  });

  const startIndex = virtualItems.length > 0 ? virtualItems[0].index : 0;
  const endIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;

  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (items.length - endIndex - 1) * ROW_HEIGHT);

  return (
    <div 
      ref={containerRef}
      className="w-full max-h-[600px] overflow-y-auto rounded-[18px] border border-white/[0.05] bg-[#0A0E1A]/40 backdrop-blur-md relative shadow-vault"
      role="region"
      aria-label="Files table list viewer"
    >
      <table className="w-full border-collapse text-left text-[13px] select-none">
        <thead className="sticky top-0 z-10 bg-[#0F172A] border-b border-white/[0.05] shadow-[0_1px_0_0_rgba(0,0,0,0.2)]">
          <tr className="label-caps">
            <th className="p-3.5 pl-5 font-bold tracking-[0.1em] text-[#475569]">Name</th>
            <th className="p-3.5 font-bold tracking-[0.1em] text-[#475569]">Type</th>
            <th className="p-3.5 font-bold tracking-[0.1em] text-[#475569]">Size</th>
            <th className="p-3.5 font-bold tracking-[0.1em] text-[#475569]">Uploaded Date</th>
            <th className="p-3.5 text-center w-12 font-bold tracking-[0.1em] text-[#475569]">Star</th>
            <th className="p-3.5 text-center w-12 pl-1 font-bold tracking-[0.1em] text-[#475569]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
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
            const badgeClass = getFileIconColor(item.name, item.type);
            
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
                    ? "bg-[#6366F1]/10 border-[#6366F1] text-white" 
                    : "border-transparent hover:bg-white/[0.03] text-[#94A3B8] hover:text-white"
                )}
              >
                <td className="p-2 pl-5">
                  <div className="flex items-center gap-3 font-semibold overflow-hidden max-w-xs sm:max-w-md">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-[8px] border shrink-0", badgeClass)}>
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{item.name}</span>
                  </div>
                </td>
                <td className="p-2 text-[#475569] font-semibold">
                  {item.type === 'FOLDER' ? 'Folder' : item.name.split('.').pop()?.toUpperCase() || 'File'}
                </td>
                <td className="p-2 text-[#94A3B8] font-bold tabular-nums">{formatSize(item.size)}</td>
                <td className="p-2 text-[#64748B] font-medium">{formatDate(item.createdDate)}</td>
                <td className="p-2 text-center">
                  {item.type === 'FILE' && (
                    <FavoriteToggle fileId={item.id} initialStarred={item.starred} />
                  )}
                </td>
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#475569] hover:text-white hover:bg-white/[0.06] rounded-[6px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, item);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
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
