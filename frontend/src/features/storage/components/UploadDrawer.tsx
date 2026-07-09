import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Play, Pause, RotateCcw, CloudUpload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { type UploadTask } from '../types';

interface UploadDrawerProps {
  queue: UploadTask[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClear: () => void;
}

export function UploadDrawer({
  queue,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClear,
}: UploadDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (queue.length === 0) return null;

  const completedCount = queue.filter((t) => t.status === 'COMPLETED').length;
  const activeCount = queue.length - completedCount;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary p-3 text-primary-foreground">
        <div className="flex items-center gap-2 font-medium">
          <CloudUpload className="h-5 w-5 animate-pulse" />
          <span>
            {activeCount > 0 ? `Uploading ${activeCount} file(s)...` : 'All uploads complete'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          {activeCount === 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Upload Items List */}
      {isOpen && (
        <div className="max-h-72 overflow-y-auto divide-y">
          {queue.map((task) => (
            <div key={task.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium" title={task.name}>
                    {task.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatSize(task.size)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {task.status === 'UPLOADING' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onPause(task.id)}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  {task.status === 'PAUSED' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onResume(task.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {task.status === 'FAILED' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" onClick={() => onRetry(task.id)}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  {task.status !== 'COMPLETED' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => onCancel(task.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {task.status === 'COMPLETED' && (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                  )}
                  {task.status === 'FAILED' && (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-1" />
                  )}
                </div>
              </div>

              {/* Progress Bar & Status Text */}
              <div className="space-y-1">
                <Progress value={task.progress} className="h-1.5" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="capitalize">{task.status.toLowerCase()}</span>
                  <span>{task.progress}%</span>
                </div>
                {task.error && (
                  <p className="text-[10px] text-red-500 truncate" title={task.error}>
                    {task.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
