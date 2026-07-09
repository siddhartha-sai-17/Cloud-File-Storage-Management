import { useState } from 'react';
import { Star, LayoutGrid, List as ListIcon, RefreshCw } from 'lucide-react';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';
import { FavoritesGrid } from '@/features/favorites/components/FavoritesGrid';
import { FavoritesTable } from '@/features/favorites/components/FavoritesTable';
import { ContextMenu } from '@/features/storage/components/ContextMenu';
import { BulkActionToolbar } from '@/features/storage/components/BulkActionToolbar';
import { PreviewModal } from '@/features/preview/components/PreviewModal';
import { VersionTimeline } from '@/features/versions/components/VersionTimeline';
import { ShareDialog } from '@/features/sharing/components/ShareDialog';
import { CommentsPanel } from '@/features/comments/components/CommentsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StorageItem } from '@/features/storage/types';
import { motion } from 'framer-motion';

export function FavoritesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { favorites, isLoading, totalPages, refetch, unstar } = useFavorites(page, 20);

  // Context menu position and selected item
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: StorageItem | null } | null>(null);

  // Modal/overlay targets
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [timelineItem, setTimelineItem] = useState<StorageItem | null>(null);
  const [shareItem, setShareItem] = useState<StorageItem | null>(null);
  const [commentsItem, setCommentsItem] = useState<StorageItem | null>(null);

  const handleItemClick = (item: StorageItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  const handleItemDoubleClick = (item: StorageItem) => {
    if (item.type === 'FILE') {
      setPreviewItem(item);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: StorageItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  const handleBulkUnstar = async () => {
    for (const id of Array.from(selectedIds)) {
      await unstar(id);
    }
    setSelectedIds(new Set());
    refetch();
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="label-caps font-bold">Bookmarks</p>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Star className="h-7 w-7 text-amber-400 fill-amber-400" />
            Starred Items
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Access files and folders that you have starred for quick retrieval.
          </p>
        </motion.div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-white/[0.06] bg-[#0F172A] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-[#6366F1]/10 text-[#818CF8]' : 'text-[#475569] hover:text-[#94A3B8]'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-[#6366F1]/10 text-[#818CF8]' : 'text-[#475569] hover:text-[#94A3B8]'
              }`}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.06] bg-[#0F172A] text-[#475569] hover:text-white hover:border-[#6366F1]/30 hover:bg-[#161F2F] transition-all duration-150"
            title="Refresh"
            aria-label="Refresh starred list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-[#6366F1]" />
            <p className="text-sm text-[#475569] font-medium">Loading starred items…</p>
          </div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16 border border-white/[0.06] rounded-[18px] bg-[#111827] space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/[0.03] border border-white/[0.05] mx-auto">
            <Star className="h-6 w-6 text-[#475569]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No starred items</h3>
            <p className="text-xs text-[#64748B]">Star files or folders to find them easily here.</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <FavoritesGrid
              items={favorites}
              selectedIds={selectedIds}
              onItemClick={handleItemClick}
              onItemDoubleClick={handleItemDoubleClick}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <FavoritesTable
              items={favorites}
              selectedIds={selectedIds}
              onItemClick={handleItemClick}
              onItemDoubleClick={handleItemDoubleClick}
              onContextMenu={handleContextMenu}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3.5 py-1.5 rounded-[8px] border border-white/[0.06] bg-[#0F172A] text-xs font-semibold text-[#94A3B8] hover:text-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-[#475569] font-medium">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3.5 py-1.5 rounded-[8px] border border-white/[0.06] bg-[#0F172A] text-xs font-semibold text-[#94A3B8] hover:text-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Context Menu Overlay */}
      <ContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        item={contextMenu?.item || null}
        onDownload={() => {}}
        onRename={() => {}}
        onMove={() => {}}
        onCopy={() => {}}
        onDelete={() => {}}
        onToggleStar={(id) => unstar(id)}
        onVersions={(item) => setTimelineItem(item)}
        onShare={(item) => setShareItem(item)}
        onComments={(item) => setCommentsItem(item)}
      />

      {/* Bulk action overlay */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onUnfavorite={handleBulkUnstar}
      />

      {/* Preview Modal */}
      {previewItem && (
        <PreviewModal
          fileId={previewItem.id}
          filename={previewItem.name}
          size={previewItem.size || 0}
          owner={undefined}
          createdDate={previewItem.createdDate}
          confidenceScore={previewItem.confidenceScore}
          tags={previewItem.tags}
          category={previewItem.category}
          isOpen={previewItem !== null}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* Version timeline sheet drawer */}
      {timelineItem && (
        <VersionTimeline
          fileId={timelineItem.id}
          filename={timelineItem.name}
          isOpen={timelineItem !== null}
          onClose={() => setTimelineItem(null)}
        />
      )}

      {/* Share Dialog */}
      {shareItem && (
        <ShareDialog
          fileId={shareItem.id}
          fileName={shareItem.name}
          open={shareItem !== null}
          onClose={() => setShareItem(null)}
        />
      )}

      {/* Comments Panel */}
      {commentsItem && (
        <Dialog open={commentsItem !== null} onOpenChange={() => setCommentsItem(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden bg-[#111827] border-white/[0.08] text-white rounded-[18px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold truncate">Comments: {commentsItem.name}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <CommentsPanel fileId={commentsItem.id} className="p-4" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
export default FavoritesPage;
