import { useEffect, useRef } from 'react';
import {
  Download,
  Edit2,
  Trash2,
  FolderInput,
  Copy,
  Star,
  History,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { type StorageItem } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  item: StorageItem | null;
  onDownload: (id: number, name: string) => void;
  onRename: (item: StorageItem) => void;
  onMove: (item: StorageItem) => void;
  onCopy: (item: StorageItem) => void;
  onDelete: (id: number, isFolder: boolean) => void;
  onToggleStar: (id: number) => void;
  onVersions?: (item: StorageItem) => void;
  onShare?: (item: StorageItem) => void;
  onComments?: (item: StorageItem) => void;
}

export function ContextMenu({
  x,
  y,
  isOpen,
  onClose,
  item,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onDelete,
  onToggleStar,
  onVersions,
  onShare,
  onComments,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="absolute z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-50 zoom-in-95 duration-100"
    >
      {item.type === 'FILE' && (
        <button
          onClick={() => {
            onDownload(item.id, item.name);
            onClose();
          }}
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Download className="mr-2 h-4 w-4" />
          <span>Download</span>
        </button>
      )}
      <button
        onClick={() => {
          onRename(item);
          onClose();
        }}
        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Edit2 className="mr-2 h-4 w-4" />
        <span>Rename</span>
      </button>
      <button
        onClick={() => {
          onMove(item);
          onClose();
        }}
        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <FolderInput className="mr-2 h-4 w-4" />
        <span>Move to...</span>
      </button>
      <button
        onClick={() => {
          onCopy(item);
          onClose();
        }}
        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Copy className="mr-2 h-4 w-4" />
        <span>Copy to...</span>
      </button>
      {item.type === 'FILE' && (
        <button
          onClick={() => {
            onToggleStar(item.id);
            onClose();
          }}
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Star className="mr-2 h-4 w-4" />
          <span>{item.starred ? 'Unstar' : 'Star'}</span>
        </button>
      )}
      {item.type === 'FILE' && onVersions && (
        <button
          onClick={() => {
            onVersions(item);
            onClose();
          }}
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <History className="mr-2 h-4 w-4" />
          <span>Version History</span>
        </button>
      )}
      {item.type === 'FILE' && onShare && (
        <button
          onClick={() => {
            onShare(item);
            onClose();
          }}
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Share2 className="mr-2 h-4 w-4" />
          <span>Share</span>
        </button>
      )}
      {item.type === 'FILE' && onComments && (
        <button
          onClick={() => {
            onComments(item);
            onClose();
          }}
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Comments</span>
        </button>
      )}
      <div className="my-1 h-px bg-muted" />
      <button
        onClick={() => {
          onDelete(item.id, item.type === 'FOLDER');
          onClose();
        }}
        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        <span>Delete</span>
      </button>
    </div>
  );
}
