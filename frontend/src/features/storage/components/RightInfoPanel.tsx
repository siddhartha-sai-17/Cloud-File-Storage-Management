import { X, Download, Share2, MessageSquare, History, Edit3, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type StorageItem } from '../types';
import { getFileIcon } from '../utils/icons';
import { useOCR } from '@/features/ocr/hooks/useOCR';
import { cn } from '@/utils/utils';
import { motion } from 'framer-motion';

interface RightInfoPanelProps {
  item: StorageItem;
  onClose: () => void;
  onDownload: (item: StorageItem) => void;
  onShare: (item: StorageItem) => void;
  onComments: (item: StorageItem) => void;
  onVersions: (item: StorageItem) => void;
  onRename: (item: StorageItem) => void;
  onMove: (item: StorageItem) => void;
  onDelete: (item: StorageItem) => void;
}

export function RightInfoPanel({
  item,
  onClose,
  onDownload,
  onShare,
  onComments,
  onVersions,
  onRename,
  onMove,
  onDelete
}: RightInfoPanelProps) {
  const { status: ocrStatus } = useOCR(item.id);

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
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const FileIcon = getFileIcon(item.name, item.type);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 border-l border-[#1e293b]/40 bg-[#111827] p-5 flex flex-col h-full overflow-y-auto text-gray-200 shadow-2xl z-10 shrink-0"
    >
      {/* Title & Close Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]/30 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">File Metadata</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5"
          title="Close details panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mini Visual Preview Block */}
      <div className="flex flex-col items-center justify-center p-6 bg-[#151b2f] border border-[#1e293b]/40 rounded-xl mb-6 shadow-inner text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 mb-3 shadow-md">
          <FileIcon className="h-8 w-8" />
        </div>
        <h4 className="text-sm font-bold text-white max-w-full truncate px-2" title={item.name}>
          {item.name}
        </h4>
        <span className="text-[10px] text-gray-500 font-semibold uppercase mt-1">
          {item.type === 'FOLDER' ? 'Folder' : item.name.split('.').pop() || 'Unknown'}
        </span>
      </div>

      {/* Primary Details Metadata */}
      <div className="space-y-4 mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Information</h4>
        
        <div className="grid grid-cols-3 text-xs py-1.5 border-b border-[#1e293b]/10">
          <span className="text-gray-400 font-medium">Size</span>
          <span className="col-span-2 text-right text-gray-200 font-semibold">{formatSize(item.size)}</span>
        </div>

        <div className="grid grid-cols-3 text-xs py-1.5 border-b border-[#1e293b]/10">
          <span className="text-gray-400 font-medium">Modified</span>
          <span className="col-span-2 text-right text-gray-200 font-semibold">{formatDate(item.createdDate)}</span>
        </div>

        <div className="grid grid-cols-3 text-xs py-1.5 border-b border-[#1e293b]/10">
          <span className="text-gray-400 font-medium">OCR Status</span>
          <span className="col-span-2 text-right">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
              ocrStatus === 'COMPLETED' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
              ocrStatus === 'PENDING' && "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse",
              ocrStatus === 'PROCESSING' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse",
              ocrStatus === 'FAILED' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
              ocrStatus === 'NONE' && "bg-gray-500/10 text-gray-400 border border-gray-500/20"
            )}>
              {ocrStatus}
            </span>
          </span>
        </div>
      </div>

      {/* Action Buttons Panel */}
      <div className="space-y-2 mt-auto">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Actions</h4>

        <div className="grid grid-cols-2 gap-2">
          {item.type === 'FILE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(item)}
              className="text-xs border-[#1e293b]/60 bg-[#151b2f] text-gray-300 hover:text-white"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
              Download
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onShare(item)}
            className="text-xs border-[#1e293b]/60 bg-[#151b2f] text-gray-300 hover:text-white"
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onComments(item)}
            className="text-xs border-[#1e293b]/60 bg-[#151b2f] text-gray-300 hover:text-white"
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
            Comments
          </Button>

          {item.type === 'FILE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVersions(item)}
              className="text-xs border-[#1e293b]/60 bg-[#151b2f] text-gray-300 hover:text-white"
            >
              <History className="mr-1.5 h-3.5 w-3.5 text-purple-400" />
              Versions
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRename(item)}
            className="text-xs border-[#1e293b]/60 bg-[#151b2f] text-gray-300 hover:text-white"
          >
            <Edit3 className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
            Rename
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onMove(item)}
            className="text-xs border-[#1e293b]/60 bg-[#151b2f] text-gray-300 hover:text-white"
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
            Move / Copy
          </Button>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(item)}
          className="w-full text-xs font-semibold mt-2 shadow-md bg-rose-600/90 hover:bg-rose-600 text-white"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Move to Trash
        </Button>
      </div>
    </motion.div>
  );
}
export default RightInfoPanel;
