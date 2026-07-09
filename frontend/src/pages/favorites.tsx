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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            Starred Items
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access files and folders that you have starred for quick retrieval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border bg-background p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh"
            aria-label="Refresh starred list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Loading starred items…</div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card space-y-2">
          <Star className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="text-sm font-semibold">No starred items</h3>
          <p className="text-xs text-muted-foreground">Star files or folders to find them easily here.</p>
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
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted disabled:opacity-50"
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
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
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
