import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { RefreshCw, FolderOpen, CloudUpload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';

import { useFileBrowser } from '../hooks/useFileBrowser';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { type StorageItem } from '../types';

import { Toolbar } from './Toolbar';
import { FileGrid } from './FileGrid';
import { FileTable } from './FileTable';
import { ContextMenu } from './ContextMenu';
import { UploadDrawer } from './UploadDrawer';
import { CreateFolderDialog, RenameDialog, MoveDialog } from './dialogs';
import { PreviewModal } from '@/features/preview/components/PreviewModal';
import { VersionTimeline } from '@/features/versions/components/VersionTimeline';
import { ShareDialog } from '@/features/sharing/components/ShareDialog';
import { CommentsPanel } from '@/features/comments/components/CommentsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BulkActionToolbar } from './BulkActionToolbar';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';

import { AnimatePresence } from 'framer-motion';
import { RightInfoPanel } from './RightInfoPanel';

export function FileExplorer() {
  // File browser logic hook
  const {
    items,
    isLoading,
    isError,
    error,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    navigateBackToBreadcrumb,
    
    // Selection
    selectedIds,
    toggleSelect,
    clearSelection,

    // Actions
    createFolder,
    isCreatingFolder,
    rename,
    isRenaming,
    deleteItem,
    toggleStar,
    moveItem,
    copyItem,
    downloadFile,
    refetch,
  } = useFileBrowser();

  // Upload queue hook
  const {
    queue,
    addToQueue,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
  } = useUploadQueue(refetch);

  const { star, unstar } = useFavorites();

  // Dialog open states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [dialogItem, setDialogItem] = useState<StorageItem | null>(null);
  const [moveActionType, setMoveActionType] = useState<'move' | 'copy'>('move');
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [timelineItem, setTimelineItem] = useState<StorageItem | null>(null);
  const [shareItem, setShareItem] = useState<StorageItem | null>(null);
  const [commentsItem, setCommentsItem] = useState<StorageItem | null>(null);

  // Context menu position and selected item
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: StorageItem | null } | null>(null);

  // Drag & drop configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      addToQueue(acceptedFiles, currentFolderId);
    }
  }, [addToQueue, currentFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // we trigger upload via the toolbar/context menus, not by clicking the background
  });

  const handleContextMenu = (e: React.MouseEvent, item: StorageItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  const handleItemClick = (item: StorageItem) => {
    toggleSelect(item.id);
  };

  const handleItemDoubleClick = (item: StorageItem) => {
    if (item.type === 'FOLDER') {
      navigateToFolder(item.id, item.name);
      clearSelection();
    } else {
      setPreviewItem(item);
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        deleteItem({ id: item.id, isFolder: item.type === 'FOLDER' });
      }
    });
    clearSelection();
  };

  const handleBulkStar = async () => {
    for (const id of Array.from(selectedIds)) {
      await star(id);
    }
    clearSelection();
  };

  const handleBulkUnstar = async () => {
    for (const id of Array.from(selectedIds)) {
      await unstar(id);
    }
    clearSelection();
  };

  const selectedItem = items.find((i) => selectedIds.has(i.id)) || null;

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col flex-1 h-full min-h-[450px] outline-none rounded-[18px] p-2 transition-all ${
        isDragActive ? 'bg-[#6366F1]/5 ring-2 ring-dashed ring-[#6366F1]/40' : ''
      }`}
    >
      <input {...getInputProps()} />

      {/* Breadcrumbs & Refresh bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <Breadcrumb
          items={breadcrumbs.map((b) => ({
            label: b.name,
            path: `/files?folderId=${b.id}`, // keep it descriptive
          }))}
          onClick={(e) => {
            // Intercept route clicks to perform local state navigation
            const target = e.target as HTMLAnchorElement;
            if (target && target.href) {
              const url = new URL(target.href);
              const folderId = url.searchParams.get('folderId');
              if (folderId) {
                const parsedId = parseInt(folderId, 10);
                const idx = breadcrumbs.findIndex((b) => b.id === parsedId);
                navigateBackToBreadcrumb(idx);
              } else {
                navigateBackToBreadcrumb(-1);
              }
              e.preventDefault();
            }
          }}
        />

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => refetch()} 
          title="Refresh page"
          className="h-8 w-8 text-[#475569] hover:text-white hover:bg-white/[0.05] rounded-[8px]"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Operations Toolbar */}
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        onUploadClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) addToQueue(files, currentFolderId);
          };
          input.click();
        }}
        onCreateFolderClick={() => setIsCreateOpen(true)}
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onClearSelection={clearSelection}
      />

      {/* Explorer Content split view */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto py-2" onClick={() => clearSelection()}>
          {isLoading ? (
            <div className="flex h-[40vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-[#6366F1]" />
                <p className="text-sm text-[#475569] font-medium">Loading files…</p>
              </div>
            </div>
          ) : isError ? (
            <ErrorState
              title="Unable to load files"
              message={error?.message || 'A network error occurred. Please try again.'}
              retryAction={refetch}
            />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-white/[0.08] rounded-[18px] bg-white/[0.01]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/[0.03] border border-white/[0.05]">
                <FolderOpen className="h-6 w-6 text-[#475569]" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white">
                  {searchQuery ? 'No search results found' : 'Folder is empty'}
                </p>
                <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">
                  {searchQuery
                    ? 'Try refactoring your search term or clear the filter.'
                    : 'Drag and drop files here to upload them instantly.'
                  }
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <FileGrid
              items={items}
              selectedIds={selectedIds}
              onItemClick={handleItemClick}
              onItemDoubleClick={handleItemDoubleClick}
              onContextMenu={handleContextMenu}
              onToggleStar={toggleStar}
            />
          ) : (
            <FileTable
              items={items}
              selectedIds={selectedIds}
              onItemClick={handleItemClick}
              onItemDoubleClick={handleItemDoubleClick}
              onContextMenu={handleContextMenu}
              onToggleStar={toggleStar}
            />
          )}
        </div>

        <AnimatePresence>
          {selectedItem && (
            <RightInfoPanel
              item={selectedItem}
              onClose={() => clearSelection()}
              onDownload={downloadFile}
              onShare={(item) => setShareItem(item)}
              onComments={(item) => setCommentsItem(item)}
              onVersions={(item) => setTimelineItem(item)}
              onRename={(item) => {
                setDialogItem(item);
                setIsRenameOpen(true);
              }}
              onMove={(item) => {
                setDialogItem(item);
                setMoveActionType('move');
                setIsMoveOpen(true);
              }}
              onDelete={(item) => deleteItem({ id: item.id, isFolder: item.type === 'FOLDER' })}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Context Menu Overlay */}
      <ContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        item={contextMenu?.item || null}
        onDownload={downloadFile}
        onRename={(item) => {
          setDialogItem(item);
          setIsRenameOpen(true);
        }}
        onMove={(item) => {
          setDialogItem(item);
          setMoveActionType('move');
          setIsMoveOpen(true);
        }}
        onCopy={(item) => {
          setDialogItem(item);
          setMoveActionType('copy');
          setIsMoveOpen(true);
        }}
        onDelete={(id, isFolder) => deleteItem({ id, isFolder })}
        onToggleStar={toggleStar}
        onVersions={(item) => setTimelineItem(item)}
        onShare={(item) => setShareItem(item)}
        onComments={(item) => setCommentsItem(item)}
      />

      {/* Dialog Modals */}
      <CreateFolderDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={(name) => createFolder({ name })}
        isLoading={isCreatingFolder}
      />

      <RenameDialog
        isOpen={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        item={dialogItem}
        onRename={(id, isFolder, newName) => rename({ id, isFolder, newName })}
        isLoading={isRenaming}
      />

      <MoveDialog
        isOpen={isMoveOpen}
        onOpenChange={setIsMoveOpen}
        item={dialogItem}
        onAction={(id, isFolder, targetFolderId) => {
          if (moveActionType === 'move') {
            moveItem({ id, isFolder, targetFolderId });
          } else {
            copyItem({ id, isFolder, targetFolderId });
          }
        }}
        actionType={moveActionType}
      />

      {/* Drag & Drop Visual overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#070B14]/80 backdrop-blur-sm pointer-events-none rounded-[18px]">
          <div className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[#6366F1] rounded-[18px] bg-[#111827] shadow-vault max-w-sm text-center">
            <CloudUpload className="h-10 w-10 text-[#6366F1] animate-bounce" />
            <h3 className="text-lg font-bold text-white">Drop to Upload</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">Release your files to start uploading them automatically.</p>
          </div>
        </div>
      )}

      {/* Upload Queue Manager drawer */}
      <UploadDrawer
        queue={queue}
        onPause={pauseUpload}
        onResume={resumeUpload}
        onCancel={cancelUpload}
        onRetry={retryUpload}
        onClear={clearCompleted}
      />

      {/* Preview modal overlay wrapper */}
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
      {/* Share dialog */}
      {shareItem && (
        <ShareDialog
          fileId={shareItem.id}
          fileName={shareItem.name}
          open={shareItem !== null}
          onClose={() => setShareItem(null)}
        />
      )}

      {/* Comments panel dialog */}
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

      {/* Bulk Action Floating Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        onDelete={handleBulkDelete}
        onFavorite={handleBulkStar}
        onUnfavorite={handleBulkUnstar}
      />
    </div>
  );
}
export default FileExplorer;
