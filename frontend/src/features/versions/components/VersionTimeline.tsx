import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVersions } from '../hooks/useVersions';
import { formatSize } from '@/features/storage/utils/icons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { FileVersionDtoResponse } from '../types';
import { Download, RotateCcw, Trash2, Calendar, User, GitCommit, ArrowLeftRight } from 'lucide-react';

interface VersionTimelineProps {
  fileId: number;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionTimeline({
  fileId,
  filename,
  isOpen,
  onClose,
}: VersionTimelineProps) {
  const {
    versions,
    isLoading,
    restoreVersion,
    deleteVersion,
    downloadVersion,
  } = useVersions(fileId);

  // States for confirm dialogs
  const [confirmRestoreId, setConfirmRestoreId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Selection states for version comparison
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const handleCompareSelect = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        // Limit to 2 maximum selections
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const getCompareVersions = (): [FileVersionDtoResponse, FileVersionDtoResponse] | null => {
    if (compareIds.length !== 2) return null;
    const v1 = versions.find((v) => v.id === compareIds[0]);
    const v2 = versions.find((v) => v.id === compareIds[1]);
    if (v1 && v2) return [v1, v2];
    return null;
  };

  const comparisonData = getCompareVersions();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
        <DialogContent className="fixed right-0 top-0 bottom-0 left-auto w-full sm:max-w-md h-full rounded-r-none rounded-l-lg border-l p-6 overflow-y-auto flex flex-col bg-card text-card-foreground outline-none">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription className="truncate">Manage versions of {filename}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
              Loading version history...
            </div>
          ) : versions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <GitCommit className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">No version history</p>
              <p className="text-xs">Only the current upload version exists.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-4 overflow-y-auto">
              <div className="relative border-l pl-4 ml-3 space-y-6">
                {versions.map((ver) => {
                  const isSelected = compareIds.includes(ver.id);
                  return (
                    <div key={ver.id} className="relative group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border bg-background flex items-center justify-center ${ver.currentVersion ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground'}`}>
                        {ver.currentVersion && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </span>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            Version v{ver.versionNumber}
                            {ver.currentVersion && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">
                                Active
                              </span>
                            )}
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCompareSelect(ver.id)}
                            className="rounded border-input text-primary h-3.5 w-3.5 cursor-pointer"
                            title="Select version to compare"
                          />
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{ver.uploadedBy}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(ver.uploadedAt).toLocaleString()}</span>
                          </div>
                          <div>Size: {formatSize(ver.size)}</div>
                          {ver.changeDescription && (
                            <p className="text-[11px] bg-muted/30 p-1 rounded mt-1 italic">
                              "{ver.changeDescription}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => downloadVersion(ver.id, filename, ver.versionNumber)}
                            title="Download Version"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {!ver.currentVersion && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                onClick={() => setConfirmRestoreId(ver.id)}
                                title="Restore Version"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => setConfirmDeleteId(ver.id)}
                                title="Delete Version"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Side by side comparison section */}
              {comparisonData && (
                <div className="border rounded-lg bg-muted/40 p-3 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold border-b pb-1">
                    <div className="flex items-center gap-1">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                      <span>Compare Metadata</span>
                    </div>
                    <button
                      onClick={() => setCompareIds([])}
                      className="text-muted-foreground hover:text-foreground text-[10px]"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="space-y-1">
                      <span className="font-semibold text-primary">v{comparisonData[0].versionNumber}</span>
                      <p className="truncate">Creator: {comparisonData[0].uploadedBy}</p>
                      <p>Size: {formatSize(comparisonData[0].size)}</p>
                      <p className="truncate" title={comparisonData[0].sha256}>SHA: {comparisonData[0].sha256.substring(0, 8)}</p>
                    </div>
                    <div className="space-y-1 border-l pl-3">
                      <span className="font-semibold text-primary">v{comparisonData[1].versionNumber}</span>
                      <p className="truncate">Creator: {comparisonData[1].uploadedBy}</p>
                      <p>Size: {formatSize(comparisonData[1].size)}</p>
                      <p className="truncate" title={comparisonData[1].sha256}>SHA: {comparisonData[1].sha256.substring(0, 8)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmRestoreId !== null}
        onOpenChange={(open) => !open && setConfirmRestoreId(null)}
        title="Restore version?"
        description="Are you sure you want to revert to this version? The current version will be archived as a prior version index history record."
        onConfirm={() => {
          if (confirmRestoreId !== null) {
            restoreVersion(confirmRestoreId);
            setConfirmRestoreId(null);
          }
        }}
      />

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Delete version history record?"
        description="Are you sure you want to delete this specific version from the archive history? This operation cannot be undone."
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            deleteVersion(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        isDestructive
      />
    </>
  );
}
