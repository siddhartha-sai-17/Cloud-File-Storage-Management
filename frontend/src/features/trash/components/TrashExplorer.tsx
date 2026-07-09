import { useState } from 'react';
import { Trash2, RotateCcw, ShieldAlert, FileIcon, FolderIcon, AlertCircle } from 'lucide-react';
import { useTrash } from '../hooks/useTrash';
import { TrashFilters } from './TrashFilters';
import { RestoreDialog } from './RestoreDialog';
import { DeleteForeverDialog } from './DeleteForeverDialog';
import type { TrashItemDto } from '../types';
import { useVirtualList } from '@/hooks/useVirtualList';

export function TrashExplorer() {
  const {
    trashItems,
    isLoading,
    restoreItem,
    permanentDelete,
    bulkRestore,
    bulkPermanentDelete,
  } = useTrash();

  const ROW_HEIGHT = 50;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FILE' | 'FOLDER'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog targets
  const [restoreTarget, setRestoreTarget] = useState<TrashItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashItemDto | null>(null);
  const [isBulkRestoreOpen, setIsBulkRestoreOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = (filteredItems: TrashItemDto[]) => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => `${item.type}-${item.id}`)));
    }
  };

  const getRetentionDays = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt).getTime();
    const diff = Date.now() - deletedDate;
    const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));
    const remaining = 30 - daysPassed;
    return remaining > 0 ? remaining : 0;
  };

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter items
  const filtered = trashItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Virtualization setup
  const { containerRef, virtualItems } = useVirtualList(filtered, {
    itemHeight: ROW_HEIGHT,
    overscan: 10,
  });

  const startIndex = virtualItems.length > 0 ? virtualItems[0].index : 0;
  const endIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;

  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (filtered.length - endIndex - 1) * ROW_HEIGHT);

  const getSelectedObjects = () => {
    const fileIds: number[] = [];
    const folderIds: number[] = [];
    selectedIds.forEach((key) => {
      const [type, idStr] = key.split('-');
      const id = parseInt(idStr, 10);
      if (type === 'FILE') fileIds.push(id);
      else folderIds.push(id);
    });
    return { fileIds, folderIds };
  };

  const handleBulkRestoreConfirm = async () => {
    const { fileIds, folderIds } = getSelectedObjects();
    await bulkRestore({ fileIds, folderIds });
    setSelectedIds(new Set());
  };

  const handleBulkDeleteConfirm = async () => {
    const { fileIds, folderIds } = getSelectedObjects();
    await bulkPermanentDelete({ fileIds, folderIds });
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions and info panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Items in Trash are permanently deleted automatically after 30 days.</span>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-2">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setIsBulkRestoreOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all dark:bg-indigo-950/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Selected
            </button>
            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-all dark:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Permanently
            </button>
          </div>
        )}
      </div>

      <TrashFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Loading trash items…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card space-y-2">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="text-sm font-semibold">Trash is empty</h3>
          <p className="text-xs text-muted-foreground">No soft-deleted files or folders found.</p>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="max-h-[500px] overflow-y-auto rounded-xl border bg-card relative"
          role="region"
          aria-label="Trash items table view"
        >
          <table className="w-full text-left text-sm border-collapse select-none">
            <thead className="sticky top-0 z-10 bg-background border-b shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
              <tr className="bg-muted/30 font-medium text-muted-foreground text-xs uppercase">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={() => toggleSelectAll(filtered)}
                    className="rounded text-primary focus:ring-primary"
                    aria-label="Select all items in trash"
                  />
                </th>
                <th className="p-3">Name</th>
                <th className="p-3">Deleted By</th>
                <th className="p-3">Deleted Date</th>
                <th className="p-3">Days Left</th>
                <th className="p-3">Size</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Top Virtual Spacer */}
              {topSpacerHeight > 0 && (
                <tr style={{ height: `${topSpacerHeight}px` }}>
                  <td colSpan={7} className="p-0 border-none" />
                </tr>
              )}

              {/* Sliced Virtual Items */}
              {virtualItems.map(({ item }) => {
                const key = `${item.type}-${item.id}`;
                const isSelected = selectedIds.has(key);
                const remaining = getRetentionDays(item.deletedAt);

                return (
                  <tr
                    key={key}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className={`hover:bg-muted/30 transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(key)}
                        className="rounded text-primary focus:ring-primary"
                        aria-label={`Select ${item.name}`}
                      />
                    </td>
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-2">
                        {item.type === 'FOLDER' ? (
                          <FolderIcon className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{item.deletedBy}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(item.deletedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          remaining <= 5
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {remaining} days
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{formatSize(item.size)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setRestoreTarget(item)}
                          className="p-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Restore"
                          aria-label={`Restore ${item.name}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors text-destructive"
                          title="Delete Permanently"
                          aria-label={`Permanently delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Bottom Virtual Spacer */}
              {bottomSpacerHeight > 0 && (
                <tr style={{ height: `${bottomSpacerHeight}px` }}>
                  <td colSpan={7} className="p-0 border-none" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {restoreTarget && (
        <RestoreDialog
          isOpen={restoreTarget !== null}
          onOpenChange={() => setRestoreTarget(null)}
          onConfirm={() =>
            restoreItem({ id: restoreTarget.id, isFolder: restoreTarget.type === 'FOLDER' })
          }
          itemName={restoreTarget.name}
        />
      )}

      {deleteTarget && (
        <DeleteForeverDialog
          isOpen={deleteTarget !== null}
          onOpenChange={() => setDeleteTarget(null)}
          onConfirm={() =>
            permanentDelete({ id: deleteTarget.id, isFolder: deleteTarget.type === 'FOLDER' })
          }
          itemName={deleteTarget.name}
        />
      )}

      {isBulkRestoreOpen && (
        <RestoreDialog
          isOpen={isBulkRestoreOpen}
          onOpenChange={setIsBulkRestoreOpen}
          onConfirm={handleBulkRestoreConfirm}
          itemName={`${selectedIds.size} items`}
        />
      )}

      {isBulkDeleteOpen && (
        <DeleteForeverDialog
          isOpen={isBulkDeleteOpen}
          onOpenChange={setIsBulkDeleteOpen}
          onConfirm={handleBulkDeleteConfirm}
          itemName={`${selectedIds.size} items`}
        />
      )}
    </div>
  );
}
