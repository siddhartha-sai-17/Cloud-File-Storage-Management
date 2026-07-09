export interface UploadProgressDto {
  sessionId: string;
  currentSpeedBps: number;
  averageSpeedBps: number;
  peakSpeedBps: number;
  etaSeconds: number;
  uploadPercentage: number;
  uploadedBytes: number;
  fileSize: number;
  status: string;
}

export type ConnectionStatusType = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export interface PresenceUser {
  userId: number;
  username: string;
  role: string;
  status: 'VIEWING' | 'EDITING' | 'IDLE';
  currentPath?: string;
  lastActive: string;
}

export interface ActivityTimelineDto {
  id: number;
  workspaceId?: number;
  username: string;
  eventType: string; // UPLOAD, DELETE, RENAME, MOVE, COMMENT, SHARE, RESTORE, VERSION_RESTORE
  entityType: string; // FILE, FOLDER, WORKSPACE
  entityId: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface QueuedUploadTask {
  sessionId: string;
  username: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  clientUploadId?: string;
  filename: string;
  fileSize: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface UploadQueueStatusDto {
  sessionId: string;
  position: number;
  priority: string;
  waitTimeSeconds: number;
  filename: string;
  fileSize: number;
  status: string;
}

export interface OcrStatistics {
  processedCount: number;
  failedCount: number;
  pendingCount: number;
  processingCount: number;
  successRate: number;
  averageProcessingTimeMs: number;
}

export interface DuplicateGroupDto {
  checksum: string;
  potentialSavings: number;
  duplicates: Array<{
    id: number;
    name: string;
    size: number;
    path: string;
    owner: string;
  }>;
}

export interface DuplicateStatsDto {
  potentialSavingsBytes: number;
  duplicateGroupsCount: number;
  duplicateFilesCount: number;
}
