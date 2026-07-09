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
  onDownload: (id: number, name: string) => void;
  onShare: (item: StorageItem) => void;
  onComments: (item: StorageItem) => void;
  onVersions: (item: StorageItem) => void;
  onRename: (item: StorageItem) => void;
  onMove: (item: StorageItem) => void;
  onDelete: (item: StorageItem) => void;
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
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

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
  const FileIcon = getFileIcon(item.name, item.type);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 border-l border-white/[0.05] bg-[#111827] p-5 flex flex-col h-full overflow-y-auto text-[#94A3B8] shadow-vault z-10 shrink-0"
    >
      {/* Title & Close Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-6">
        <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.12em]">File Metadata</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-[#475569] hover:text-white hover:bg-white/[0.05] rounded-[6px]"
          title="Close details panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mini Visual Preview Block */}
      <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/[0.05] rounded-[14px] mb-6 shadow-inner text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#818CF8] mb-3 shadow-md">
          <FileIcon className="h-8 w-8" />
        </div>
        <h4 className="text-[13px] font-bold text-white max-w-full truncate px-2" title={item.name}>
          {item.name}
        </h4>
        <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider mt-1">
          {item.type === 'FOLDER' ? 'Folder' : item.name.split('.').pop() || 'Unknown'}
        </span>
      </div>

      {/* Primary Details Metadata */}
      <div className="space-y-4 mb-6">
        <h4 className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.12em]">Information</h4>
        
        <div className="grid grid-cols-3 text-[12px] py-2 border-b border-white/[0.03]">
          <span className="text-[#64748B] font-medium">Size</span>
          <span className="col-span-2 text-right text-white font-semibold">{formatSize(item.size)}</span>
        </div>

        <div className="grid grid-cols-3 text-[12px] py-2 border-b border-white/[0.03]">
          <span className="text-[#64748B] font-medium">Modified</span>
          <span className="col-span-2 text-right text-white font-semibold">{formatDate(item.createdDate)}</span>
        </div>

        <div className="grid grid-cols-3 text-[12px] py-2 border-b border-white/[0.03]">
          <span className="text-[#64748B] font-medium">OCR Status</span>
          <span className="col-span-2 text-right">
            <span className={cn(
              "px-2 py-0.5 rounded-[5px] text-[9px] font-bold uppercase tracking-wide",
              ocrStatus === 'COMPLETED' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
              ocrStatus === 'PENDING' && "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse",
              ocrStatus === 'PROCESSING' && "bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20 animate-pulse",
              ocrStatus === 'FAILED' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
              ocrStatus === 'NONE' && "bg-white/[0.04] text-[#475569] border border-white/[0.05]"
            )}>
              {ocrStatus}
            </span>
          </span>
        </div>
      </div>

      {/* Action Buttons Panel */}
      <div className="space-y-2 mt-auto">
        <h4 className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.12em] mb-2.5">Actions</h4>

        <div className="grid grid-cols-2 gap-2">
          {item.type === 'FILE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(item.id, item.name)}
              className="text-[11px] font-semibold border-white/[0.06] bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#161F2F] rounded-[8px] h-8"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-[#818CF8]" />
              <span>Download</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onShare(item)}
            className="text-[11px] font-semibold border-white/[0.06] bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#161F2F] rounded-[8px] h-8"
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
            <span>Share</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onComments(item)}
            className="text-[11px] font-semibold border-white/[0.06] bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#161F2F] rounded-[8px] h-8"
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
            <span>Comments</span>
          </Button>

          {item.type === 'FILE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVersions(item)}
              className="text-[11px] font-semibold border-white/[0.06] bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#161F2F] rounded-[8px] h-8"
            >
              <History className="mr-1.5 h-3.5 w-3.5 text-purple-400" />
              <span>Versions</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onRename(item)}
            className="text-[11px] font-semibold border-white/[0.06] bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#161F2F] rounded-[8px] h-8"
          >
            <Edit3 className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
            <span>Rename</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onMove(item)}
            className="text-[11px] font-semibold border-white/[0.06] bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#161F2F] rounded-[8px] h-8"
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5 text-[#818CF8]" />
            <span>Move</span>
          </Button>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(item)}
          className="w-full text-[11px] font-bold mt-2 shadow-md bg-rose-600/90 hover:bg-rose-600 text-white rounded-[8px] h-8.5"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          <span>Move to Trash</span>
        </Button>
      </div>
    </motion.div>
  );
}
export default RightInfoPanel;
