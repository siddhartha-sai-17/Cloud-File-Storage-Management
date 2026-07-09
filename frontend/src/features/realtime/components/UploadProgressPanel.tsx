import { useUploadSocket } from '../hooks/useUploadSocket';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Clock, ArrowUpRight, Zap, RefreshCw, XCircle } from 'lucide-react';

interface UploadProgressPanelProps {
  sessionId: string | null;
  filename: string;
}

export function UploadProgressPanel({ sessionId, filename }: UploadProgressPanelProps) {
  const { progress, isLoading, isSocketConnected } = useUploadSocket(sessionId);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bps: number) => {
    if (!bps || bps <= 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatEta = (seconds: number) => {
    if (seconds === undefined || seconds === null || seconds < 0) return 'Calculating...';
    if (seconds === 0) return 'Done';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-xl text-muted-foreground text-xs">
        No active upload session selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 border rounded-xl text-muted-foreground text-xs gap-2">
        <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
        <span>Loading session transfer telemetry...</span>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border rounded-xl text-rose-500 text-xs gap-1">
        <XCircle className="h-5 w-5" />
        <span>Unable to resolve session progress.</span>
      </div>
    );
  }

  const {
    uploadPercentage = 0,
    currentSpeedBps = 0,
    averageSpeedBps = 0,
    peakSpeedBps = 0,
    etaSeconds = 0,
    uploadedBytes = 0,
    fileSize = 0,
    status = 'INITIALIZING'
  } = progress;

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4 shadow-sm" aria-label={`Upload status for ${filename}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5 overflow-hidden">
          <h4 className="text-xs font-bold text-foreground truncate max-w-[220px]" title={filename}>
            {filename}
          </h4>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold">{status}</span>
            <span>•</span>
            <span>{isSocketConnected ? 'WebSocket Live' : 'Polling Fallback'}</span>
          </p>
        </div>
        <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded">
          {uploadPercentage.toFixed(0)}%
        </div>
      </div>

      <Progress value={uploadPercentage} className="h-2" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
        <div className="flex items-center gap-2 text-muted-foreground border-r pr-1">
          <HardDrive className="h-3.5 w-3.5 shrink-0" />
          <div className="overflow-hidden">
            <span className="block text-[10px] font-medium text-muted-foreground/75">Transferred</span>
            <span className="font-semibold text-foreground truncate block">
              {formatSize(uploadedBytes)} / {formatSize(fileSize)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground pl-1">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <div className="overflow-hidden">
            <span className="block text-[10px] font-medium text-muted-foreground/75">Time Remaining</span>
            <span className="font-semibold text-foreground truncate block">
              {formatEta(etaSeconds)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground border-r pr-1 mt-1">
          <ArrowUpRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <div className="overflow-hidden">
            <span className="block text-[10px] font-medium text-muted-foreground/75">Speed</span>
            <span className="font-semibold text-foreground truncate block">
              {formatSpeed(currentSpeedBps)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground pl-1 mt-1">
          <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <div className="overflow-hidden">
            <span className="block text-[10px] font-medium text-muted-foreground/75">Peak Speed</span>
            <span className="font-semibold text-foreground truncate block">
              {formatSpeed(peakSpeedBps)}
            </span>
          </div>
        </div>
      </div>

      {averageSpeedBps > 0 && (
        <div className="text-[9px] text-muted-foreground/80 flex items-center justify-between border-t pt-2">
          <span>Average Upload Velocity</span>
          <span className="font-bold text-foreground">{formatSpeed(averageSpeedBps)}</span>
        </div>
      )}
    </div>
  );
}
