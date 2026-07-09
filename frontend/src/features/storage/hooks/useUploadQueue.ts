import { useState, useCallback, useRef } from 'react';
import { uploadService } from '../services/upload.service';
import { storageService } from '../services/storage.service';
import { type UploadTask } from '../types';
import { calculateSHA256 } from '../utils/checksum';

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
  name?: string;
  code?: string;
}

const CHUNK_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB

export function useUploadQueue(onSuccessCallback?: () => void) {
  const [queue, setQueue] = useState<UploadTask[]>([]);
  const abortControllers = useRef<Record<string, AbortController>>({});

  const updateTask = useCallback((id: string, updates: Partial<UploadTask>) => {
    setQueue((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  }, []);

  const uploadSingle = useCallback(async (task: UploadTask, folderId?: number) => {
    try {
      updateTask(task.id, { status: 'UPLOADING', progress: 0 });
      await storageService.uploadSingleFile(task.file, folderId);
      updateTask(task.id, { status: 'COMPLETED', progress: 100 });
      if (onSuccessCallback) onSuccessCallback();
    } catch (err: unknown) {
      const error = err as AxiosErrorLike;
      updateTask(task.id, {
        status: 'FAILED',
        error: error.response?.data?.message || error.message || 'Single upload failed',
      });
    }
  }, [updateTask, onSuccessCallback]);

  const uploadInChunks = useCallback(async (taskId: string, folderId?: number) => {
    // 1. Get task current state
    let currentTask = queue.find((t) => t.id === taskId);
    if (!currentTask) return;

    try {
      const file = currentTask.file;
      let sessionId = currentTask.sessionId;
      let chunkSize = currentTask.chunkSize || CHUNK_SIZE_THRESHOLD;
      let totalChunks = currentTask.totalChunks || Math.ceil(file.size / chunkSize);
      let startChunkIndex = currentTask.chunkIndex || 0;

      // Initialize session if not already initialized
      if (!sessionId) {
        updateTask(taskId, { status: 'INITIALIZING' });
        const initResponse = await uploadService.initSession(file.name, file.size, folderId);
        sessionId = initResponse.sessionId;
        chunkSize = initResponse.chunkSize || chunkSize;
        totalChunks = initResponse.totalChunks || totalChunks;
        updateTask(taskId, {
          sessionId,
          chunkSize,
          totalChunks,
          status: 'UPLOADING',
        });
      } else {
        updateTask(taskId, { status: 'UPLOADING' });
      }

      // Loop through chunks from startChunkIndex to totalChunks - 1
      for (let i = startChunkIndex; i < totalChunks; i++) {
        // Re-read task state in case of pause/cancel
        const activeTask = queue.find((t) => t.id === taskId);
        if (!activeTask || activeTask.status === 'PAUSED' || activeTask.status === 'CANCELLED') {
          return;
        }

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunkBlob = file.slice(start, end);

        // Compute checksum for chunk
        const chunkChecksum = await calculateSHA256(chunkBlob);

        // Create AbortController for this chunk upload
        const controller = new AbortController();
        abortControllers.current[taskId] = controller;

        await uploadService.uploadChunk(
          sessionId,
          i + 1, // 1-based index for backend
          chunkBlob,
          chunkChecksum,
          (progressEvent) => {
            const chunkProgress = progressEvent.total ? progressEvent.loaded / progressEvent.total : 0;
            const overallUploadedBytes = start + chunkProgress * chunkBlob.size;
            const overallProgress = Math.min(Math.round((overallUploadedBytes / file.size) * 100), 99);
            updateTask(taskId, { progress: overallProgress, uploadedBytes: overallUploadedBytes });
          },
          controller.signal
        );

        updateTask(taskId, { chunkIndex: i + 1 });
      }

      // Complete upload
      const activeTask = queue.find((t) => t.id === taskId);
      if (activeTask && activeTask.status === 'UPLOADING') {
        const fileChecksum = await calculateSHA256(file);
        await uploadService.completeSession(sessionId, fileChecksum);
        updateTask(taskId, { status: 'COMPLETED', progress: 100 });
        delete abortControllers.current[taskId];
        if (onSuccessCallback) onSuccessCallback();
      }
    } catch (err: unknown) {
      const error = err as AxiosErrorLike;
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        // Handled via pause/cancel
        return;
      }
      updateTask(taskId, {
        status: 'FAILED',
        error: error.response?.data?.message || error.message || 'Chunked upload failed',
      });
    }
  }, [queue, updateTask, onSuccessCallback]);

  const addToQueue = useCallback((files: File[], folderId?: number) => {
    const newTasks: UploadTask[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'IDLE',
    }));

    setQueue((prev) => [...prev, ...newTasks]);

    // Start uploading tasks
    newTasks.forEach((task) => {
      if (task.file.size < CHUNK_SIZE_THRESHOLD) {
        uploadSingle(task, folderId);
      } else {
        uploadInChunks(task.id, folderId);
      }
    });
  }, [uploadSingle, uploadInChunks]);

  const pauseUpload = useCallback((id: string) => {
    const task = queue.find((t) => t.id === id);
    if (!task || task.status !== 'UPLOADING') return;

    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
    }

    updateTask(id, { status: 'PAUSED' });
  }, [queue, updateTask]);

  const resumeUpload = useCallback((id: string) => {
    const task = queue.find((t) => t.id === id);
    if (!task || task.status !== 'PAUSED') return;

    updateTask(id, { status: 'UPLOADING' });
    uploadInChunks(id);
  }, [queue, updateTask, uploadInChunks]);

  const cancelUpload = useCallback(async (id: string) => {
    const task = queue.find((t) => t.id === id);
    if (!task) return;

    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
    }

    updateTask(id, { status: 'CANCELLED' });

    if (task.sessionId) {
      try {
        await uploadService.cancelSession(task.sessionId);
      } catch {
        // Ignored
      }
    }

    setQueue((prev) => prev.filter((t) => t.id !== id));
  }, [queue, updateTask]);

  const retryUpload = useCallback((id: string) => {
    const task = queue.find((t) => t.id === id);
    if (!task || task.status !== 'FAILED') return;

    updateTask(id, { status: 'IDLE', error: undefined, progress: 0, chunkIndex: 0, sessionId: undefined });
    if (task.file.size < CHUNK_SIZE_THRESHOLD) {
      uploadSingle(task);
    } else {
      uploadInChunks(task.id);
    }
  }, [queue, updateTask, uploadSingle, uploadInChunks]);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((task) => task.status !== 'COMPLETED'));
  }, []);

  return {
    queue,
    addToQueue,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
  };
}
