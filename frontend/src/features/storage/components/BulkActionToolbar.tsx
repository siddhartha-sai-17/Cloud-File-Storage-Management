import {
  FolderInput,
  Copy,
  Trash2,
  RotateCcw,
  Star,
  StarOff,
  Download,
  Share2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onMove?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onFavorite?: () => void;
  onUnfavorite?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onPermanentDelete?: () => void;
  showRestore?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  onClear,
  onMove,
  onCopy,
  onDelete,
  onRestore,
  onFavorite,
  onUnfavorite,
  onDownload,
  onShare,
  onPermanentDelete,
  showRestore = false,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-3 bg-card border shadow-2xl rounded-full px-4 py-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <span className="text-xs font-semibold text-primary mr-1 bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
        {selectedCount} Selected
      </span>

      <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto max-w-[70vw] md:max-w-none">
        {/* Restore (soft-deleted files) */}
        {showRestore && onRestore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            className="h-8 rounded-full text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2.5"
            title="Restore selected"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Restore</span>
          </Button>
        )}

        {/* Favorite */}
        {!showRestore && onFavorite && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFavorite}
            className="h-8 rounded-full text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 px-2.5"
            title="Star selected"
          >
            <Star className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Star</span>
          </Button>
        )}

        {/* Unfavorite */}
        {!showRestore && onUnfavorite && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnfavorite}
            className="h-8 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2.5"
            title="Unstar selected"
          >
            <StarOff className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Unstar</span>
          </Button>
        )}

        {/* Move */}
        {!showRestore && onMove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMove}
            className="h-8 rounded-full text-xs font-medium px-2.5"
            title="Move selected"
          >
            <FolderInput className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Move</span>
          </Button>
        )}

        {/* Copy */}
        {!showRestore && onCopy && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-8 rounded-full text-xs font-medium px-2.5"
            title="Copy selected"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
        )}

        {/* Download */}
        {!showRestore && onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="h-8 rounded-full text-xs font-medium px-2.5"
            title="Download selected"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        )}

        {/* Share */}
        {!showRestore && onShare && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className="h-8 rounded-full text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 px-2.5"
            title="Share selected"
          >
            <Share2 className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}

        {/* Delete (Soft delete) */}
        {!showRestore && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 rounded-full text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5"
            title="Move to Trash"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        )}

        {/* Permanent Delete */}
        {onPermanentDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPermanentDelete}
            className="h-8 rounded-full text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5"
            title="Delete permanently"
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Delete Forever</span>
          </Button>
        )}
      </div>

      <div className="h-4 w-px bg-muted mx-1 shrink-0" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
