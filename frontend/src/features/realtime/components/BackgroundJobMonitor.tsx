import { useBackgroundJobs } from '../hooks/useBackgroundJobs';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { HardDrive, ArrowUp, X, RefreshCw, Cpu, CheckCircle } from 'lucide-react';

export function BackgroundJobMonitor() {
  const {
    queue,
    isLoadingQueue,
    queueStats,
    ocrStats,
    isLoadingOcrStats,
    promoteSession,
    cancelSession,
    reindexAll,
    isReindexingAll,
  } = useBackgroundJobs();

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* OCR Health / Stats Card */}
      <div className="border rounded-xl p-5 bg-card space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
            <h3 className="text-sm font-bold">OCR Intelligence Engine</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reindexAll()}
            disabled={isReindexingAll}
            className="text-[10px] h-7 px-2.5"
          >
            {isReindexingAll ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Reindex All Files
          </Button>
        </div>

        {isLoadingOcrStats ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-1.5">
            <LoadingSpinner size={16} />
            <span>Resolving OCR workers...</span>
          </div>
        ) : !ocrStats ? (
          <p className="text-xs text-muted-foreground text-center py-4">No OCR statistics available</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="border rounded-lg p-2.5 bg-muted/40">
              <span className="block text-[10px] text-muted-foreground font-semibold">Processed</span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">{ocrStats.processedCount}</span>
            </div>
            <div className="border rounded-lg p-2.5 bg-muted/40">
              <span className="block text-[10px] text-muted-foreground font-semibold">Pending</span>
              <span className="text-lg font-bold text-amber-600 mt-0.5 block">{ocrStats.pendingCount}</span>
            </div>
            <div className="border rounded-lg p-2.5 bg-muted/40">
              <span className="block text-[10px] text-muted-foreground font-semibold">Failed Jobs</span>
              <span className={`text-lg font-bold mt-0.5 block ${ocrStats.failedCount > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                {ocrStats.failedCount}
              </span>
            </div>
            <div className="border rounded-lg p-2.5 bg-muted/40">
              <span className="block text-[10px] text-muted-foreground font-semibold">Success Rate</span>
              <span className="text-lg font-bold text-emerald-600 mt-0.5 block">{ocrStats.successRate.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload queue monitor */}
      <div className="border rounded-xl p-5 bg-card space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4.5 w-4.5 text-indigo-600" />
            <h3 className="text-sm font-bold">Background Upload Scheduler</h3>
          </div>
          {queueStats && typeof queueStats.activeUploadsCount === 'number' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
              {queueStats.activeUploadsCount} active • {queueStats.totalQueuedCount || 0} queued
            </span>
          )}
        </div>

        {isLoadingQueue ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-1.5">
            <LoadingSpinner size={16} />
            <span>Resolving upload queue...</span>
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs flex flex-col items-center justify-center gap-1">
            <CheckCircle className="h-6 w-6 text-emerald-500" />
            <span>Upload schedule is empty. All chunks processed!</span>
          </div>
        ) : (
          <div className="divide-y max-h-[300px] overflow-y-auto pr-1">
            {queue.map((task) => (
              <div key={task.sessionId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4">
                <div className="space-y-0.5 overflow-hidden">
                  <span className="block text-xs font-semibold text-foreground truncate max-w-[200px]" title={task.filename}>
                    {task.filename}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{formatSize(task.fileSize)}</span>
                    <span>•</span>
                    <span className={`font-semibold ${task.priority === 'HIGH' ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      {task.priority} Priority
                    </span>
                    <span>•</span>
                    <span>Pos {task.position}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {task.priority !== 'HIGH' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => promoteSession(task.sessionId)}
                      className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 p-0"
                      title="Promote Priority to HIGH"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => cancelSession(task.sessionId)}
                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-0"
                    title="Cancel Session"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
