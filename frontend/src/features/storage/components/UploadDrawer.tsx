import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Play, Pause, RotateCcw, CloudUpload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type UploadTask } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/utils';

interface UploadDrawerProps {
  queue: UploadTask[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClear: () => void;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

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

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] rounded-[16px] border border-white/[0.08] bg-[#111827] shadow-vault-xl overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] p-3 px-4 text-white">
        <div className="flex items-center gap-2.5 font-bold text-[13px]">
          <CloudUpload className="h-4.5 w-4.5 animate-pulse" />
          <span>
            {activeCount > 0 ? `Uploading ${activeCount} file(s)...` : 'Uploads complete'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 rounded-[6px]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronUp className="h-4.5 w-4.5" />}
          </Button>
          {activeCount === 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 rounded-[6px]"
              onClick={onClear}
            >
              <X className="h-4.5 w-4.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Upload Items List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]"
          >
            {queue.map((task) => {
              const isUploading = task.status === 'UPLOADING';
              const isPaused = task.status === 'PAUSED';
              const isFailed = task.status === 'FAILED';
              const isCompleted = task.status === 'COMPLETED';

              return (
                <div key={task.id} className="p-3.5 space-y-2.5 bg-white/[0.01]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="overflow-hidden min-w-0">
                      <p className="truncate text-[12px] font-bold text-white leading-tight" title={task.name}>
                        {task.name}
                      </p>
                      <p className="text-[10px] text-[#475569] font-semibold mt-0.5">{formatSize(task.size)}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {isUploading && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6.5 w-6.5 text-[#64748B] hover:text-white hover:bg-white/[0.06] rounded-[6px]" 
                          onClick={() => onPause(task.id)}
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isPaused && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6.5 w-6.5 text-[#818CF8] hover:text-white hover:bg-white/[0.06] rounded-[6px]" 
                          onClick={() => onResume(task.id)}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isFailed && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6.5 w-6.5 text-amber-500 hover:bg-white/[0.06] rounded-[6px]" 
                          onClick={() => onRetry(task.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!isCompleted && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6.5 w-6.5 text-[#64748B] hover:text-rose-400 hover:bg-rose-500/10 rounded-[6px]" 
                          onClick={() => onCancel(task.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isCompleted && (
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-400 mr-1" />
                      )}
                      {isFailed && (
                        <AlertCircle className="h-4.5 w-4.5 text-rose-400 mr-1" />
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Status Text */}
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ duration: 0.3 }}
                        className={`h-full rounded-full ${
                          isFailed 
                            ? 'bg-rose-500' 
                            : isCompleted 
                              ? 'bg-emerald-500' 
                              : 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]'
                        }`}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                      <span className={cn(
                        isCompleted && 'text-emerald-400',
                        isFailed && 'text-rose-400',
                        isPaused && 'text-amber-400',
                        isUploading && 'text-[#818CF8]'
                      )}>
                        {task.status.toLowerCase()}
                      </span>
                      <span className="text-white">{task.progress}%</span>
                    </div>

                    {task.error && (
                      <p className="text-[10px] text-rose-400 truncate mt-0.5" title={task.error}>
                        {task.error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UploadDrawer;
